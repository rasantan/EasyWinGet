import { createAdminClient } from "@/lib/supabase/admin";

import {
  iconCandidatesForDomain,
  resolveIconDomain,
} from "./icon-sources";
import type { Package } from "./types";

type WikipediaSummary = {
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
};

type EnrichmentResult = {
  description_full?: string;
  icon_url?: string;
};

function needsEnrichment(pkg: Package): boolean {
  return !pkg.description_full?.trim() || !pkg.icon_url?.trim();
}

async function isImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) return false;
    const type = response.headers.get("content-type") ?? "";
    return type.startsWith("image/");
  } catch {
    return false;
  }
}

async function resolveBestIcon(pkg: Package): Promise<string | undefined> {
  const domain = resolveIconDomain({
    package_id: pkg.package_id,
    name: pkg.name,
    publisher: pkg.publisher,
    homepage: pkg.homepage,
    publisher_url: pkg.publisher_url,
  });

  if (!domain) return undefined;

  for (const candidate of iconCandidatesForDomain(domain)) {
    if (await isImageUrl(candidate)) return candidate;
  }

  return undefined;
}

async function fetchWikipediaSummary(
  searchTerm: string,
): Promise<EnrichmentResult | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as WikipediaSummary;
    const description = data.extract ?? data.description;

    return {
      description_full: description?.trim() || undefined,
      icon_url: data.thumbnail?.source?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

async function fetchFromWikipedia(
  pkg: Package,
): Promise<EnrichmentResult | null> {
  const candidates = [
    pkg.name,
    `${pkg.publisher} ${pkg.name}`,
    pkg.publisher,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = await fetchWikipediaSummary(candidate);
    if (result?.description_full || result?.icon_url) {
      return result;
    }
  }

  return null;
}

export async function hydratePackageMetadata(
  pkg: Package,
): Promise<EnrichmentResult> {
  if (!needsEnrichment(pkg)) {
    return {};
  }

  const result: EnrichmentResult = {};
  const missingDescription = !pkg.description_full?.trim();
  const missingIcon = !pkg.icon_url?.trim();

  if (missingDescription || missingIcon) {
    const wiki = await fetchFromWikipedia(pkg);

    if (wiki?.description_full && missingDescription) {
      result.description_full = wiki.description_full;
    }

    if (wiki?.icon_url && missingIcon) {
      result.icon_url = wiki.icon_url;
    }
  }

  if (!result.icon_url && missingIcon) {
    result.icon_url = await resolveBestIcon(pkg);
  }

  return result;
}

export async function persistPackageEnrichment(
  packageUuid: string,
  updates: EnrichmentResult,
): Promise<void> {
  const payload: Record<string, string> = {};

  if (updates.description_full?.trim()) {
    payload.description_full = updates.description_full.trim();
  }

  if (updates.icon_url?.trim()) {
    payload.icon_url = updates.icon_url.trim();
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    return;
  }

  const { error } = await admin
    .from("packages")
    .update(payload)
    .eq("id", packageUuid);

  if (error) {
    console.error("persistPackageEnrichment failed:", error.message);
  }
}

export function mergeEnrichedPackage(
  pkg: Package,
  enrichment: EnrichmentResult,
): Package {
  return {
    ...pkg,
    description_full: enrichment.description_full ?? pkg.description_full,
    icon_url: enrichment.icon_url ?? pkg.icon_url,
  };
}

export { needsEnrichment };
