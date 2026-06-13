import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ActiveFilterChips } from "@/components/store/active-filter-chips";
import { PackageCard } from "@/components/store/package-card";
import { PackageGridSkeleton } from "@/components/store/package-grid-skeleton";
import { SearchBar } from "@/components/store/search-bar";
import { StoreFilters } from "@/components/store/store-filters";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  getCategories,
  getFacets,
  getPublishers,
  searchPackages,
} from "@/lib/packages/queries";
import type {
  LicenseGroup,
  PackageSort,
  RecentRange,
} from "@/lib/packages/types";

type StorePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    publisher?: string;
    sort?: string;
    license?: string;
    recent?: string;
    page?: string;
  }>;
};

const LICENSE_GROUPS: LicenseGroup[] = [
  "open-source",
  "proprietary",
  "unknown",
];
const RECENT_RANGES: RecentRange[] = ["month", "quarter", "year"];

function parseCategories(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function StorePagination({
  page,
  totalPages,
  searchParams,
  labels,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  labels: { previous: string; next: string; pageOf: string };
}) {
  if (totalPages <= 1) {
    return null;
  }

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.delete("page");
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/store?${qs}` : "/store";
  };

  return (
    <nav
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground">{labels.pageOf}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button
            render={<Link href={buildHref(page - 1)} />}
            variant="outline"
            className="min-h-11"
          >
            {labels.previous}
          </Button>
        ) : (
          <Button variant="outline" className="min-h-11" disabled>
            {labels.previous}
          </Button>
        )}
        {page < totalPages ? (
          <Button
            render={<Link href={buildHref(page + 1)} />}
            variant="outline"
            className="min-h-11"
          >
            {labels.next}
          </Button>
        ) : (
          <Button variant="outline" className="min-h-11" disabled>
            {labels.next}
          </Button>
        )}
      </div>
    </nav>
  );
}

export default async function StorePage({ searchParams }: StorePageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const selectedCategories = parseCategories(params.category);
  const publisher = params.publisher;
  const sort = params.sort as PackageSort | undefined;
  const licenseGroup = LICENSE_GROUPS.includes(params.license as LicenseGroup)
    ? (params.license as LicenseGroup)
    : undefined;
  const recent = RECENT_RANGES.includes(params.recent as RecentRange)
    ? (params.recent as RecentRange)
    : undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations("store");

  const [result, categories, publishers, facets] = await Promise.all([
    searchPackages(
      query,
      {
        categories: selectedCategories,
        publisher,
        licenseGroup,
        recent,
        sort,
      },
      page,
    ),
    getCategories(),
    getPublishers(),
    getFacets(),
  ]);

  const { data: packages, count, totalPages } = result;

  const paginationParams: Record<string, string | undefined> = {
    q: query || undefined,
    category: selectedCategories.length
      ? selectedCategories.join(",")
      : undefined,
    publisher,
    sort: sort ?? undefined,
    license: licenseGroup,
    recent,
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-8 space-y-2 border-b border-border pb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <div className="mb-6">
        <Suspense fallback={<PackageGridSkeleton count={1} />}>
          <SearchBar defaultValue={query} />
        </Suspense>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="mb-6 lg:mb-0 lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={null}>
            <StoreFilters
              categories={categories}
              publishers={publishers}
              facets={facets}
            />
          </Suspense>
        </aside>

        <div className="min-w-0">
          <Suspense fallback={null}>
            <ActiveFilterChips />
          </Suspense>

          {packages.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-16 text-center"
              role="status"
            >
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium">
                {t("empty.title")}
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {t("empty.description")}
              </p>
              <Button
                render={<Link href="/store" />}
                variant="outline"
                className="mt-6 min-h-11"
              >
                {t("empty.clearFilters")}
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("resultsCount", { count })}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {packages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
              <div className="mt-8">
                <StorePagination
                  page={page}
                  totalPages={totalPages}
                  searchParams={paginationParams}
                  labels={{
                    previous: t("pagination.previous"),
                    next: t("pagination.next"),
                    pageOf: t("pagination.pageOf", {
                      page,
                      total: totalPages,
                    }),
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
