import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parse } from "yaml";

export type ParsedPackage = {
  package_id: string;
  name: string;
  publisher: string;
  description: string;
  description_full: string | null;
  version: string;
  installer_type: string | null;
  categories: string[];
  tags: string[];
  moniker: string | null;
  homepage: string | null;
  publisher_url: string | null;
  publisher_support_url: string | null;
  license: string | null;
  release_date: string | null;
  last_synced_at: string;
};

type ManifestYaml = {
  PackageIdentifier?: string;
  PackageName?: string;
  Publisher?: string;
  PackageVersion?: string;
  ShortDescription?: string;
  Description?: string;
  Tags?: string[];
  Moniker?: string;
  Installers?: Array<{ InstallerType?: string }>;
};

const TAG_CATEGORY_MAP: Record<string, string> = {
  developertools: "developer-tools",
  "developer tools": "developer-tools",
  developer: "developer-tools",
  programming: "developer-tools",
  ide: "developer-tools",
  code: "developer-tools",
  productivity: "productivity",
  office: "productivity",
  utilities: "utilities",
  utility: "utilities",
  tools: "utilities",
  multimedia: "multimedia",
  media: "multimedia",
  audio: "multimedia",
  video: "multimedia",
  music: "multimedia",
  games: "games",
  game: "games",
  gaming: "games",
  browser: "browsers",
  browsers: "browsers",
  web: "browsers",
  social: "social",
  messaging: "social",
  chat: "social",
  communication: "social",
};

// Maps a manifest tag to a curated category, or null when it isn't part of the
// controlled vocabulary. We deliberately do NOT fall back to the tag itself —
// otherwise every free-form tag would become a "category" and the store filter
// would explode into thousands of one-off entries.
function normalizeTag(tag: string): string | null {
  const spaced = tag.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  const compact = spaced.replace(/[^a-z0-9]+/g, "");

  return TAG_CATEGORY_MAP[spaced] ?? TAG_CATEGORY_MAP[compact] ?? null;
}

export function mapTagsToCategories(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  const categories = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const category = normalizeTag(tag);
    if (category) categories.add(category);
  }

  return Array.from(categories);
}

export function isLocaleManifest(path: string): boolean {
  return /\.locale\./i.test(path);
}

export function isInstallerOnlyManifest(path: string): boolean {
  return /\.installer\.ya?ml$/i.test(path);
}

export function isMainManifest(path: string): boolean {
  if (!/\.ya?ml$/i.test(path)) return false;
  if (isLocaleManifest(path)) return false;
  if (isInstallerOnlyManifest(path)) return false;
  return true;
}

export function resolveMainManifestPath(path: string): string | null {
  if (isMainManifest(path)) return path;
  if (isInstallerOnlyManifest(path)) {
    return path.replace(/\.installer\.ya?ml$/i, ".yaml");
  }
  return null;
}

function extractInstallerType(
  data: ManifestYaml,
  installerContent?: string,
): string | null {
  const fromMain = data.Installers?.[0]?.InstallerType;
  if (fromMain) return fromMain.toLowerCase();

  if (installerContent) {
    const installerData = parse(installerContent) as ManifestYaml;
    const fromInstaller = installerData.Installers?.[0]?.InstallerType;
    if (fromInstaller) return fromInstaller.toLowerCase();
  }

  return null;
}

export function parseManifestContent(
  content: string,
  installerContent?: string,
): ParsedPackage | null {
  const data = parse(content) as ManifestYaml;
  if (!data?.PackageIdentifier) return null;

  const now = new Date().toISOString();

  return {
    package_id: data.PackageIdentifier,
    name: data.PackageName ?? data.PackageIdentifier,
    publisher: data.Publisher ?? "",
    description: data.ShortDescription ?? data.Description ?? "",
    description_full: data.Description ?? null,
    version: data.PackageVersion ?? "",
    installer_type: extractInstallerType(data, installerContent),
    categories: mapTagsToCategories(data.Tags),
    moniker: data.Moniker ?? null,
    last_synced_at: now,
  };
}

export function parseManifestFile(filePath: string): ParsedPackage | null {
  const content = readFileSync(filePath, "utf8");
  const dir = dirname(filePath);
  const base = basename(filePath).replace(/\.ya?ml$/i, "");
  let installerContent: string | undefined;

  const installerPath = join(dir, `${base}.installer.yaml`);
  try {
    installerContent = readFileSync(installerPath, "utf8");
  } catch {
    // installer manifest is optional
  }

  return parseManifestContent(content, installerContent);
}
