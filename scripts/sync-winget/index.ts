import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { Octokit } from "@octokit/rest";

import {
  isMainManifest,
  parseManifestContent,
  parseManifestFile,
  resolveMainManifestPath,
  type ParsedPackage,
} from "./parse-manifest.js";
import { upsertPackages } from "./upsert-packages.js";

const WINGET_OWNER = "microsoft";
const WINGET_REPO = "winget-pkgs";
const MANIFESTS_PREFIX = "manifests/";

function isFullSync(): boolean {
  if (process.argv.includes("--full")) return true;
  const env = process.env.FULL_SYNC?.toLowerCase();
  return env === "true" || env === "1";
}

function getMaxPackages(): number | undefined {
  const raw = process.env.FULL_SYNC_MAX_PACKAGES;
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function walkManifestFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (isMainManifest(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

async function fetchFileContent(
  octokit: Octokit,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: WINGET_OWNER,
      repo: WINGET_REPO,
      path,
    });

    if (!("content" in data) || typeof data.content !== "string") {
      return null;
    }

    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

async function parseManifestFromGitHub(
  octokit: Octokit,
  manifestPath: string,
): Promise<ParsedPackage | null> {
  const mainPath = resolveMainManifestPath(manifestPath);
  if (!mainPath) return null;

  const content = await fetchFileContent(octokit, mainPath);
  if (!content) return null;

  const installerPath = mainPath.replace(/\.ya?ml$/i, ".installer.yaml");
  const installerContent = await fetchFileContent(octokit, installerPath);

  return parseManifestContent(
    content,
    installerContent ?? undefined,
  );
}

async function getChangedManifestPaths(octokit: Octokit): Promise<string[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const paths = new Set<string>();

  console.log(`Fetching commits since ${since}...`);

  for await (const response of octokit.paginate.iterator(
    octokit.repos.listCommits,
    {
      owner: WINGET_OWNER,
      repo: WINGET_REPO,
      since,
      per_page: 100,
    },
  )) {
    for (const commit of response.data) {
      const { data: detail } = await octokit.repos.getCommit({
        owner: WINGET_OWNER,
        repo: WINGET_REPO,
        ref: commit.sha,
      });

      for (const file of detail.files ?? []) {
        if (file.status === "removed") continue;
        if (!file.filename.startsWith(MANIFESTS_PREFIX)) continue;
        if (!/\.ya?ml$/i.test(file.filename)) continue;

        const mainPath = resolveMainManifestPath(file.filename);
        if (mainPath) paths.add(mainPath);
      }
    }
  }

  return Array.from(paths);
}

async function collectPackagesFromGitHub(
  octokit: Octokit,
  manifestPaths: string[],
): Promise<ParsedPackage[]> {
  const packages: ParsedPackage[] = [];
  const seen = new Set<string>();

  for (const path of manifestPaths) {
    const parsed = await parseManifestFromGitHub(octokit, path);
    if (!parsed || seen.has(parsed.package_id)) continue;

    seen.add(parsed.package_id);
    packages.push(parsed);
  }

  return packages;
}

async function collectPackagesFromDirectory(
  manifestsDir: string,
): Promise<ParsedPackage[]> {
  const files = walkManifestFiles(manifestsDir);
  const maxPackages = getMaxPackages();
  const packages: ParsedPackage[] = [];
  const seen = new Set<string>();

  console.log(`Found ${files.length} manifest files in ${manifestsDir}`);

  for (const filePath of files) {
    if (maxPackages && packages.length >= maxPackages) {
      console.log(`Reached FULL_SYNC_MAX_PACKAGES limit (${maxPackages})`);
      break;
    }

    const parsed = parseManifestFile(filePath);
    if (!parsed || seen.has(parsed.package_id)) continue;

    seen.add(parsed.package_id);
    packages.push(parsed);
  }

  return packages;
}

async function main(): Promise<void> {
  const fullSync = isFullSync();
  const mode = fullSync ? "full" : "incremental";

  console.log(`EasyWinGet WinGet sync — mode: ${mode}`);

  let packages: ParsedPackage[] = [];

  if (fullSync) {
    const manifestsDir = process.env.WINGET_PKGS_DIR;

    if (!manifestsDir) {
      throw new Error(
        "FULL_SYNC requires WINGET_PKGS_DIR pointing to the manifests folder (e.g. winget-pkgs/manifests)",
      );
    }

    packages = await collectPackagesFromDirectory(manifestsDir);
  } else {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const changedPaths = await getChangedManifestPaths(octokit);
    console.log(`Found ${changedPaths.length} changed manifest paths`);

    packages = await collectPackagesFromGitHub(octokit, changedPaths);
  }

  console.log(`Parsed ${packages.length} unique packages`);

  if (packages.length === 0) {
    console.log("Nothing to sync.");
    return;
  }

  const exportPath = process.env.SYNC_EXPORT_JSON;
  if (exportPath) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(exportPath, JSON.stringify(packages, null, 2), "utf8");
    console.log(`Exported ${packages.length} packages to ${exportPath}`);
    return;
  }

  const stats = await upsertPackages(packages);

  console.log("Sync complete.");
  console.log(`Upserted: ${stats.upserted}`);
  console.log(`Errors: ${stats.errors}`);

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sync failed: ${message}`);
  process.exit(1);
});
