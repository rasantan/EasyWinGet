import { createClient } from "@/lib/supabase/server";

import {
  hydratePackageMetadata,
  mergeEnrichedPackage,
  needsEnrichment,
  persistPackageEnrichment,
} from "./enrichment";
import type {
  Package,
  PackageFilters,
  SearchPackagesResult,
} from "./types";

const PAGE_SIZE = 24;

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

  if (filters.category) {
    q = q.contains("categories", [filters.category]);
  }

  if (filters.publisher) {
    q = q.eq("publisher", filters.publisher);
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

  const { data, error } = await supabase.from("packages").select("categories");

  if (error) {
    throw new Error(`getCategories failed: ${error.message}`);
  }

  const categories = new Set<string>();
  for (const row of data ?? []) {
    for (const category of row.categories ?? []) {
      categories.add(category);
    }
  }

  return [...categories].sort();
}

export async function getPublishers(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .select("publisher")
    .order("publisher");

  if (error) {
    throw new Error(`getPublishers failed: ${error.message}`);
  }

  const publishers = new Set<string>();
  for (const row of data ?? []) {
    if (row.publisher) {
      publishers.add(row.publisher);
    }
  }

  return [...publishers].sort();
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
