import { createClient } from "@/lib/supabase/server";

import {
  hydratePackageMetadata,
  mergeEnrichedPackage,
  needsEnrichment,
  persistPackageEnrichment,
} from "./enrichment";
import type {
  FacetCount,
  Package,
  PackageFacets,
  PackageFilters,
  RecentRange,
  SearchPackagesResult,
} from "./types";

const PAGE_SIZE = 24;

function recentRangeToIsoDate(range: RecentRange): string {
  const now = new Date();
  const monthsBack = range === "month" ? 1 : range === "quarter" ? 3 : 12;
  now.setMonth(now.getMonth() - monthsBack);
  return now.toISOString();
}

export async function searchPackages(
  query: string,
  filters: PackageFilters,
  page: number,
): Promise<SearchPackagesResult> {
  const supabase = await createClient();
  let q = supabase.from("packages").select("*", { count: "exact" });

  if (query.trim()) {
    q = q.textSearch("search_vector", query.trim(), {
      type: "websearch",
      config: "simple",
    });
  }

  if (filters.categories && filters.categories.length > 0) {
    // "qualquer uma": pacote casa se tiver ao menos uma das categorias.
    q = q.overlaps("categories", filters.categories);
  }

  if (filters.publisher) {
    q = q.eq("publisher", filters.publisher);
  }

  if (filters.licenseGroup) {
    // Linhas antigas podem ter license_group NULL: tratamos NULL como "unknown".
    if (filters.licenseGroup === "unknown") {
      q = q.or("license_group.eq.unknown,license_group.is.null");
    } else {
      q = q.eq("license_group", filters.licenseGroup);
    }
  }

  if (filters.recent) {
    q = q.gte("release_date", recentRangeToIsoDate(filters.recent));
  }

  if (filters.installer_type) {
    q = q.eq("installer_type", filters.installer_type);
  }

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sort = filters.sort ?? "relevance";
  if (sort === "name") {
    q = q.order("name", { ascending: true });
  } else if (sort === "recent") {
    q = q.order("release_date", { ascending: false, nullsFirst: false });
  } else {
    // relevance: proxy por popularidade interna, depois nome
    q = q.order("popularity", { ascending: false }).order("name", { ascending: true });
  }

  const { data, count, error } = await q.range(from, to);

  if (error) {
    throw new Error(`searchPackages failed: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as Package[],
    count: total,
    page: safePage,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getPackageByPackageId(
  packageId: string,
): Promise<Package | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("package_id", packageId)
    .maybeSingle();

  if (error) {
    throw new Error(`getPackageByPackageId failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const pkg = data as Package;

  if (!needsEnrichment(pkg)) {
    return pkg;
  }

  const enrichment = await hydratePackageMetadata(pkg);
  void persistPackageEnrichment(pkg.id, enrichment);

  return mergeEnrichedPackage(pkg, enrichment);
}

export async function getCategories(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("distinct_categories");

  if (error) {
    throw new Error(`getCategories failed: ${error.message}`);
  }

  return (data ?? []).map((row: { category: string }) => row.category);
}

export async function getPublishers(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("distinct_publishers", {
    max_rows: 500,
  });

  if (error) {
    throw new Error(`getPublishers failed: ${error.message}`);
  }

  return (data ?? []).map((row: { publisher: string }) => row.publisher);
}

export async function getFacets(): Promise<PackageFacets> {
  const supabase = await createClient();

  const [categoryRes, licenseRes] = await Promise.all([
    supabase.rpc("category_facets"),
    supabase.rpc("license_group_facets"),
  ]);

  // Degrada graciosamente: se uma RPC falhar, devolve faceta vazia em vez de quebrar a página.
  const categories: FacetCount[] = categoryRes.error
    ? []
    : ((categoryRes.data ?? []) as { category: string; count: number }[]).map(
        (row) => ({ value: row.category, count: Number(row.count) }),
      );

  const licenseGroups: FacetCount[] = licenseRes.error
    ? []
    : ((licenseRes.data ?? []) as {
        license_group: string | null;
        count: number;
      }[]).map((row) => ({
        value: row.license_group ?? "unknown",
        count: Number(row.count),
      }));

  return { categories, licenseGroups };
}

export async function getFeaturedPackages(limit = 6): Promise<Package[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .order("popularity", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`getFeaturedPackages failed: ${error.message}`);
  }

  return (data ?? []) as Package[];
}
