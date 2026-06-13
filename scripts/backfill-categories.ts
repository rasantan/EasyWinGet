/**
 * Backfill de categorias + license_group para os pacotes já existentes.
 *
 * Reprocessa os ~13k pacotes a partir de tags/nome/descrição/moniker/publisher/
 * license persistidos, usando o MESMO classificador do sync
 * (scripts/sync-winget/classify.ts). Idempotente: pode rodar quantas vezes quiser.
 *
 * Como rodar (a partir do repo root):
 *   1. Garanta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou em .env.local
 *      (use `node scripts/configure-service-role-env.mjs` para popular a service role).
 *   2. npm run backfill:categories
 *      (equivale a: node --import ./scripts/sync-winget/node_modules/tsx/dist/loader.mjs scripts/backfill-categories.ts)
 *
 * Flags:
 *   --dry-run        não escreve no banco, só calcula e loga estatísticas.
 *   --batch-size N   tamanho do lote de leitura/escrita (padrão 500).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  CATEGORIES,
  classifyCategories,
  classifyLicenseGroup,
  type Category,
  type LicenseGroup,
} from "./sync-winget/classify.js";

type PackageRow = {
  id: string;
  tags: string[] | null;
  name: string | null;
  description: string | null;
  moniker: string | null;
  publisher: string | null;
  license: string | null;
};

/** Carrega .env.local (sem sobrescrever variáveis já definidas). */
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  let content: string;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function requireEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias. " +
        "Defina no ambiente ou em .env.local (veja scripts/configure-service-role-env.mjs).",
    );
  }
  return { url, key };
}

function getFlagNumber(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) {
    const parsed = Number.parseInt(process.argv[i + 1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { url, key } = requireEnv();
  const dryRun = process.argv.includes("--dry-run");
  const batchSize = getFlagNumber("--batch-size", 500);

  console.log(`Supabase alvo: ${new URL(url).host}`);
  console.log(`Modo: ${dryRun ? "DRY-RUN (sem escrita)" : "escrita habilitada"}`);
  console.log(`Batch size: ${batchSize}`);

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let total = 0;
  let withCategory = 0;
  let updated = 0;
  let errors = 0;
  const categoryCounts = new Map<Category, number>();
  const licenseCounts: Record<LicenseGroup, number> = {
    "open-source": 0,
    proprietary: 0,
    unknown: 0,
  };
  for (const category of CATEGORIES) categoryCounts.set(category, 0);

  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("packages")
      .select("id, tags, name, description, moniker, publisher, license")
      .order("id", { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) {
      throw new Error(`Falha ao ler pacotes (offset ${from}): ${error.message}`);
    }
    if (!data || data.length === 0) break;

    const updates: Array<{
      id: string;
      categories: string[];
      license_group: LicenseGroup;
    }> = [];

    for (const row of data as PackageRow[]) {
      total += 1;
      const categories = classifyCategories({
        tags: row.tags ?? [],
        name: row.name ?? undefined,
        moniker: row.moniker,
        description: row.description,
        publisher: row.publisher,
      });
      const licenseGroup = classifyLicenseGroup(row.license);

      if (categories.length > 0) {
        withCategory += 1;
        for (const category of categories) {
          categoryCounts.set(
            category as Category,
            (categoryCounts.get(category as Category) ?? 0) + 1,
          );
        }
      }
      licenseCounts[licenseGroup] += 1;

      updates.push({ id: row.id, categories, license_group: licenseGroup });
    }

    if (!dryRun && updates.length > 0) {
      // UPDATE por linha (não upsert: as linhas já existem e package_id é
      // not-null, então um insert implícito do upsert falharia). Limitamos a
      // concorrência para não estourar conexões.
      const concurrency = 25;
      for (let i = 0; i < updates.length; i += concurrency) {
        const slice = updates.slice(i, i + concurrency);
        const results = await Promise.all(
          slice.map((u) =>
            supabase
              .from("packages")
              .update({ categories: u.categories, license_group: u.license_group })
              .eq("id", u.id),
          ),
        );
        for (const { error: updateError } of results) {
          if (updateError) {
            if (errors === 0) {
              console.error(`Update falhou (offset ${from}): ${updateError.message}`);
            }
            errors += 1;
          } else {
            updated += 1;
          }
        }
      }
    }

    console.log(
      `Processados ${total} pacotes (offset ${from}..${from + data.length - 1})`,
    );

    if (data.length < batchSize) break;
    from += batchSize;
  }

  const pct = total > 0 ? ((withCategory / total) * 100).toFixed(1) : "0.0";

  console.log("\n===== Estatísticas de cobertura =====");
  console.log(`Total de pacotes: ${total}`);
  console.log(`Com ≥1 categoria: ${withCategory} (${pct}%)`);
  if (!dryRun) console.log(`Atualizados: ${updated} | Erros: ${errors}`);

  console.log("\nDistribuição por categoria:");
  const sortedCategories = [...categoryCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  for (const [category, count] of sortedCategories) {
    console.log(`  ${category.padEnd(24)} ${count}`);
  }

  console.log("\nDistribuição license_group:");
  for (const group of ["open-source", "proprietary", "unknown"] as const) {
    console.log(`  ${group.padEnd(24)} ${licenseCounts[group]}`);
  }

  if (errors > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Backfill falhou: ${message}`);
  process.exit(1);
});
