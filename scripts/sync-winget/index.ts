import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { downloadSourceMsix } from "./download-source.js";
import { extractIndexDb } from "./extract-index.js";
import { fetchManifestsConcurrently } from "./fetch-manifest.js";
import { readIndex } from "./read-index.js";
import { selectEntriesToFetch } from "./select-entries.js";
import { upsertPackages } from "./upsert-packages.js";

function getLimit(): number | undefined {
  const flagIndex = process.argv.indexOf("--limit");
  if (flagIndex >= 0 && process.argv[flagIndex + 1]) {
    const parsed = Number.parseInt(process.argv[flagIndex + 1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias (apontando para o Supabase de producao)",
    );
  }
  return { url, key };
}

async function fetchExistingVersions(
  url: string,
  key: string,
): Promise<{ versions: Map<string, string>; total: number }> {
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const versions = new Map<string, string>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("packages")
      .select("package_id, version")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Falha ao ler versoes atuais: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      versions.set(row.package_id as string, (row.version as string) ?? "");
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return { versions, total: versions.size };
}

async function recalcPopularity(url: string, key: string): Promise<void> {
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.rpc("recalc_package_popularity");
  if (error) {
    console.warn(`Aviso: recalc_package_popularity falhou: ${error.message}`);
  } else {
    console.log("Popularidade recalculada.");
  }
}

async function main(): Promise<void> {
  const { url, key } = requireEnv();
  const limit = getLimit();

  console.log(`Supabase alvo: ${new URL(url).host}`);

  const { versions: existing, total } = await fetchExistingVersions(url, key);
  console.log(`Pacotes atualmente no banco: ${total}`);

  const workDir = mkdtempSync(join(tmpdir(), "winstack-sync-"));

  try {
    const msixPath = join(workDir, "source.msix");
    await downloadSourceMsix(msixPath);

    const dbPath = extractIndexDb(msixPath, workDir);
    const indexEntries = readIndex(dbPath);
    console.log(`Pacotes na fonte pre-indexada: ${indexEntries.length}`);

    const toFetch = selectEntriesToFetch(indexEntries, existing, limit);
    console.log(`Novos/atualizados para deep-fetch: ${toFetch.length}`);

    if (toFetch.length === 0) {
      console.log("Catalogo ja esta atualizado. Nada a fazer.");
      return;
    }

    const packages = await fetchManifestsConcurrently(toFetch, {
      concurrency: 12,
      token: process.env.GITHUB_TOKEN,
    });
    console.log(`Manifests oficiais lidos: ${packages.length}`);

    const exportPath = process.env.SYNC_EXPORT_JSON;
    if (exportPath) {
      writeFileSync(exportPath, JSON.stringify(packages, null, 2), "utf8");
      console.log(`Exportado ${packages.length} pacotes para ${exportPath}`);
      return;
    }

    const stats = await upsertPackages(packages);
    console.log(`Upserted: ${stats.upserted} | Errors: ${stats.errors}`);

    await recalcPopularity(url, key);

    if (stats.errors > 0) process.exitCode = 1;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sync failed: ${message}`);
  process.exit(1);
});
