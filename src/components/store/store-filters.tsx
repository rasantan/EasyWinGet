"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { formatCategoryLabel } from "@/lib/packages/category-icon";
import type {
  LicenseGroup,
  PackageFacets,
  RecentRange,
} from "@/lib/packages/types";

type StoreFiltersProps = {
  categories: string[];
  publishers: string[];
  facets: PackageFacets;
};

const LICENSE_OPTIONS: LicenseGroup[] = [
  "open-source",
  "proprietary",
  "unknown",
];
const RECENT_OPTIONS: RecentRange[] = ["month", "quarter", "year"];

function buildCountMap(
  entries: { value: string; count: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.value, (map.get(entry.value) ?? 0) + entry.count);
  }
  return map;
}

export function StoreFilters({
  categories,
  publishers,
  facets,
}: StoreFiltersProps) {
  const t = useTranslations("store");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedCategories = new Set(
    (searchParams.get("category") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  const currentPublisher = searchParams.get("publisher") ?? "";
  const currentLicense = searchParams.get("license") ?? "";
  const currentRecent = searchParams.get("recent") ?? "";
  const currentSort = searchParams.get("sort") ?? "relevance";

  const categoryCounts = buildCountMap(facets.categories);
  const licenseCounts = buildCountMap(facets.licenseGroups);

  const commit = (params: URLSearchParams) => {
    params.delete("page");
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const setSingle = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    commit(params);
  };

  const toggleCategory = (category: string) => {
    const next = new Set(selectedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) {
      params.set("category", Array.from(next).join(","));
    } else {
      params.delete("category");
    }
    commit(params);
  };

  const licenseLabel = (value: LicenseGroup) => {
    if (value === "open-source") return t("filters.licenseOpenSource");
    if (value === "proprietary") return t("filters.licenseProprietary");
    return t("filters.licenseUnknown");
  };

  const recentLabel = (value: RecentRange) => {
    if (value === "month") return t("filters.recentMonth");
    if (value === "quarter") return t("filters.recentQuarter");
    return t("filters.recentYear");
  };

  const groupHeadingClass =
    "font-[family-name:var(--font-heading)] text-sm font-semibold text-foreground";
  const countClass = "ml-auto text-xs text-muted-foreground tabular-nums";
  const optionRowClass =
    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted";

  const filtersBody = (
    <div className="space-y-7">
      {/* Categorias (multi) */}
      <fieldset>
        <legend className={`mb-2 ${groupHeadingClass}`}>
          {t("filters.categoriesGroup")}
        </legend>
        <div className="-mx-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
          {categories.map((category) => {
            const count = categoryCounts.get(category);
            return (
              <label key={category} className={optionRowClass}>
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-border accent-primary"
                  checked={selectedCategories.has(category)}
                  onChange={() => toggleCategory(category)}
                />
                <span className="truncate">
                  {formatCategoryLabel(category)}
                </span>
                {count !== undefined ? (
                  <span className={countClass}>{count}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Licença (single) */}
      <fieldset>
        <legend className={`mb-2 ${groupHeadingClass}`}>
          {t("filters.licenseGroup")}
        </legend>
        <div className="-mx-2 space-y-0.5">
          <label className={optionRowClass}>
            <input
              type="radio"
              name="license"
              className="size-4 shrink-0 accent-primary"
              checked={currentLicense === ""}
              onChange={() => setSingle("license", null)}
            />
            <span>{t("filters.licenseAll")}</span>
          </label>
          {LICENSE_OPTIONS.map((option) => {
            const count = licenseCounts.get(option);
            return (
              <label key={option} className={optionRowClass}>
                <input
                  type="radio"
                  name="license"
                  className="size-4 shrink-0 accent-primary"
                  checked={currentLicense === option}
                  onChange={() => setSingle("license", option)}
                />
                <span className="truncate">{licenseLabel(option)}</span>
                {count !== undefined ? (
                  <span className={countClass}>{count}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Atualização (single) */}
      <fieldset>
        <legend className={`mb-2 ${groupHeadingClass}`}>
          {t("filters.recentGroup")}
        </legend>
        <div className="-mx-2 space-y-0.5">
          <label className={optionRowClass}>
            <input
              type="radio"
              name="recent"
              className="size-4 shrink-0 accent-primary"
              checked={currentRecent === ""}
              onChange={() => setSingle("recent", null)}
            />
            <span>{t("filters.recentAny")}</span>
          </label>
          {RECENT_OPTIONS.map((option) => (
            <label key={option} className={optionRowClass}>
              <input
                type="radio"
                name="recent"
                className="size-4 shrink-0 accent-primary"
                checked={currentRecent === option}
                onChange={() => setSingle("recent", option)}
              />
              <span>{recentLabel(option)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Publisher (select) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-filter-publisher" className={groupHeadingClass}>
          {t("filters.publisher")}
        </label>
        <Select
          value={currentPublisher || "all"}
          onValueChange={(value) =>
            setSingle("publisher", value === "all" ? null : value)
          }
        >
          <SelectTrigger id="store-filter-publisher" className="min-h-11 w-full">
            <SelectValue placeholder={t("filters.publisher")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allPublishers")}</SelectItem>
            {publishers.map((publisher) => (
              <SelectItem key={publisher} value={publisher}>
                {publisher}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ordenação (select) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-filter-sort" className={groupHeadingClass}>
          {t("filters.sortLabel")}
        </label>
        <Select
          value={currentSort}
          onValueChange={(value) =>
            setSingle("sort", value === "relevance" ? null : value)
          }
        >
          <SelectTrigger id="store-filter-sort" className="min-h-11 w-full">
            <SelectValue placeholder={t("filters.sortLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">
              {t("filters.sortRelevance")}
            </SelectItem>
            <SelectItem value="name">{t("filters.sortName")}</SelectItem>
            <SelectItem value="recent">{t("filters.sortRecent")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: botão + drawer */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" className="min-h-11 w-full" />
            }
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t("filters.mobileButton")}
          </SheetTrigger>
          <SheetContent side="left" className="w-[88%] max-w-sm">
            <SheetHeader>
              <SheetTitle>{t("filters.title")}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-6">{filtersBody}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: sidebar fixa */}
      <div className="hidden lg:block">
        <h2 className={`mb-4 ${groupHeadingClass} text-base`}>
          {t("filters.title")}
        </h2>
        {filtersBody}
      </div>
    </>
  );
}
