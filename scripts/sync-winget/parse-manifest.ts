import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parse } from "yaml";

import {
  classifyCategories,
  classifyLicenseGroup,
  type LicenseGroup,
} from "./classify.js";

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
  license_group: LicenseGroup;
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
  License?: string;
  Installers?: Array<{ InstallerType?: string }>;
};

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
  const tags = Array.isArray(data.Tags)
    ? data.Tags.filter((t): t is string => typeof t === "string")
    : [];
  const name = data.PackageName ?? data.PackageIdentifier;
  const moniker = data.Moniker ?? null;
  const description = data.ShortDescription ?? data.Description ?? "";
  const publisher = data.Publisher ?? "";
  const license = data.License ?? null;

  return {
    package_id: data.PackageIdentifier,
    name,
    publisher,
    description,
    description_full: data.Description ?? null,
    version: data.PackageVersion ?? "",
    installer_type: extractInstallerType(data, installerContent),
    categories: classifyCategories({
      tags,
      name,
      moniker,
      description,
      publisher,
    }),
    tags,
    moniker,
    homepage: null,
    publisher_url: null,
    publisher_support_url: null,
    license,
    license_group: classifyLicenseGroup(license),
    release_date: null,
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
