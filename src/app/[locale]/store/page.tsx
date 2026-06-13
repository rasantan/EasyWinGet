import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PackageCard } from "@/components/store/package-card";
import { PackageGridSkeleton } from "@/components/store/package-grid-skeleton";
import { SearchBar } from "@/components/store/search-bar";
import { StoreFilters } from "@/components/store/store-filters";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  getCategories,
  getPublishers,
  searchPackages,
} from "@/lib/packages/queries";
import type { PackageSort } from "@/lib/packages/types";

type StorePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    publisher?: string;
    sort?: string;
    page?: string;
  }>;
};

function StorePagination({
  page,
  totalPages,
  query,
  category,
  publisher,
  sort,
  labels,
}: {
  page: number;
  totalPages: number;
  query: string;
  category?: string;
  publisher?: string;
  sort?: string;
  labels: { previous: string; next: string; pageOf: string };
}) {
  if (totalPages <= 1) {
    return null;
  }

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (publisher) params.set("publisher", publisher);
    if (sort) params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/store?${qs}` : "/store";
  };

  return (
    <nav
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground">
        {labels.pageOf}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button render={<Link href={buildHref(page - 1)} />} variant="outline" className="min-h-11">
            {labels.previous}
          </Button>
        ) : (
          <Button variant="outline" className="min-h-11" disabled>
            {labels.previous}
          </Button>
        )}
        {page < totalPages ? (
          <Button render={<Link href={buildHref(page + 1)} />} variant="outline" className="min-h-11">
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
  const category = params.category;
  const publisher = params.publisher;
  const sort = params.sort as PackageSort | undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations("store");

  const [result, categories, publishers] = await Promise.all([
    searchPackages(query, { category, publisher, sort }, page),
    getCategories(),
    getPublishers(),
  ]);

  const { data: packages, count, totalPages } = result;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10 relative">
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-1/4 size-72 rounded-full bg-primary/5 blur-3xl -z-10 pointer-events-none" />

      <header className="mb-8 space-y-2 border-b border-border/40 pb-5">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{t("title")}</h1>
        <p className="text-base text-muted-foreground max-w-2xl">{t("description")}</p>
      </header>

      <div className="mb-6 space-y-4">
        <Suspense fallback={<PackageGridSkeleton count={1} />}>
          <SearchBar defaultValue={query} />
        </Suspense>
        <Suspense fallback={null}>
          <StoreFilters categories={categories} publishers={publishers} />
        </Suspense>
      </div>

      {packages.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center"
          role="status"
        >
          <h2 className="text-lg font-medium">{t("empty.title")}</h2>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
          <div className="mt-8">
            <StorePagination
              page={page}
              totalPages={totalPages}
              query={query}
              category={category}
              publisher={publisher}
              sort={sort}
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
  );
}
