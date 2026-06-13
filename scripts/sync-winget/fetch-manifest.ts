import { parse } from "yaml";

import { classifyCategories, classifyLicenseGroup } from "./classify.js";
import { type ParsedPackage } from "./parse-manifest.js";

const RAW_BASE = "https://raw.githubusercontent.com/microsoft/winget-pkgs/master";

type LocaleYaml = {
  PackageName?: string;
  Publisher?: string;
  ShortDescription?: string;
  Description?: string;
  Moniker?: string;
  PackageUrl?: string;
  PublisherUrl?: string;
  PublisherSupportUrl?: string;
  License?: string;
  ReleaseDate?: string | Date;
  Tags?: unknown;
};

type VersionYaml = {
  DefaultLocale?: string;
};

export function buildManifestDir(packageId: string, version: string): string {
  const firstChar = packageId.charAt(0).toLowerCase();
  const segments = packageId.split(".").filter(Boolean);
  return `manifests/${firstChar}/${segments.join("/")}/${version}`;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

export function parseLocaleManifest(
  localeContent: string,
  ctx: { package_id: string; version: string },
): ParsedPackage {
  const data = (parse(localeContent) as LocaleYaml) ?? {};
  const tags = Array.isArray(data.Tags)
    ? data.Tags.filter((t): t is string => typeof t === "string")
    : [];

  const name = asString(data.PackageName) ?? ctx.package_id;
  const publisher = asString(data.Publisher) ?? "";
  const description =
    asString(data.ShortDescription) ?? asString(data.Description) ?? "";
  const moniker = asString(data.Moniker);
  const license = asString(data.License);

  return {
    package_id: ctx.package_id,
    name,
    publisher,
    description,
    description_full: asString(data.Description),
    version: ctx.version,
    installer_type: null,
    categories: classifyCategories({
      tags,
      name,
      moniker,
      description,
      publisher,
    }),
    tags,
    moniker,
    homepage: asString(data.PackageUrl),
    publisher_url: asString(data.PublisherUrl),
    publisher_support_url: asString(data.PublisherSupportUrl),
    license,
    license_group: classifyLicenseGroup(license),
    release_date: asString(data.ReleaseDate),
    last_synced_at: new Date().toISOString(),
  };
}

async function fetchText(url: string, token?: string): Promise<string | null> {
  const headers: Record<string, string> = { "User-Agent": "WinStack-sync/1.0" };
  if (token) headers.Authorization = `token ${token}`;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function fetchPackageManifest(
  entry: { package_id: string; version: string },
  token?: string,
): Promise<ParsedPackage | null> {
  const dir = buildManifestDir(entry.package_id, entry.version);

  const versionContent = await fetchText(
    `${RAW_BASE}/${dir}/${entry.package_id}.yaml`,
    token,
  );

  let defaultLocale = "en-US";
  if (versionContent) {
    const versionData = parse(versionContent) as VersionYaml;
    if (versionData?.DefaultLocale) defaultLocale = versionData.DefaultLocale;
  }

  const localeContent =
    (await fetchText(
      `${RAW_BASE}/${dir}/${entry.package_id}.locale.${defaultLocale}.yaml`,
      token,
    )) ??
    (await fetchText(
      `${RAW_BASE}/${dir}/${entry.package_id}.locale.en-US.yaml`,
      token,
    ));

  if (!localeContent) return null;

  return parseLocaleManifest(localeContent, entry);
}

export async function fetchManifestsConcurrently(
  entries: Array<{ package_id: string; version: string }>,
  options: { concurrency?: number; token?: string } = {},
): Promise<ParsedPackage[]> {
  const concurrency = options.concurrency ?? 12;
  const results: ParsedPackage[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < entries.length) {
      const current = entries[index];
      index += 1;
      const parsed = await fetchPackageManifest(current, options.token);
      if (parsed) results.push(parsed);
      if (index % 200 === 0) {
        console.log(`Deep-fetch: ${index}/${entries.length}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()),
  );

  return results;
}
