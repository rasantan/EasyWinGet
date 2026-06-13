"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import { formatCategoryLabel } from "@/lib/packages/category-icon";

type ActiveChip = {
  key: string;
  label: string;
  remove: () => URLSearchParams;
};

export function ActiveFilterChips() {
  const t = useTranslations("store");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const categories = (searchParams.get("category") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const publisher = searchParams.get("publisher") ?? "";
  const license = searchParams.get("license") ?? "";
  const recent = searchParams.get("recent") ?? "";

  const baseParams = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    return params;
  };

  const apply = (params: URLSearchParams) => {
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const licenseLabel = (value: string) => {
    if (value === "open-source") return t("filters.licenseOpenSource");
    if (value === "proprietary") return t("filters.licenseProprietary");
    return t("filters.licenseUnknown");
  };

  const recentLabel = (value: string) => {
    if (value === "month") return t("filters.recentMonth");
    if (value === "quarter") return t("filters.recentQuarter");
    return t("filters.recentYear");
  };

  const chips: ActiveChip[] = [];

  if (query) {
    chips.push({
      key: "q",
      label: t("chips.searchLabel", { query }),
      remove: () => {
        const params = baseParams();
        params.delete("q");
        return params;
      },
    });
  }

  for (const category of categories) {
    chips.push({
      key: `category:${category}`,
      label: formatCategoryLabel(category),
      remove: () => {
        const params = baseParams();
        const next = categories.filter((entry) => entry !== category);
        if (next.length > 0) {
          params.set("category", next.join(","));
        } else {
          params.delete("category");
        }
        return params;
      },
    });
  }

  if (license) {
    chips.push({
      key: "license",
      label: licenseLabel(license),
      remove: () => {
        const params = baseParams();
        params.delete("license");
        return params;
      },
    });
  }

  if (recent) {
    chips.push({
      key: "recent",
      label: recentLabel(recent),
      remove: () => {
        const params = baseParams();
        params.delete("recent");
        return params;
      },
    });
  }

  if (publisher) {
    chips.push({
      key: "publisher",
      label: publisher,
      remove: () => {
        const params = baseParams();
        params.delete("publisher");
        return params;
      },
    });
  }

  if (chips.length === 0) {
    return null;
  }

  const clearAll = () => {
    const params = baseParams();
    params.delete("q");
    params.delete("category");
    params.delete("license");
    params.delete("recent");
    params.delete("publisher");
    apply(params);
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => apply(chip.remove())}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{chip.label}</span>
          <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">
            {t("chips.remove", { label: chip.label })}
          </span>
        </button>
      ))}

      <button
        type="button"
        onClick={clearAll}
        className="rounded-md px-2 py-1 text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("chips.clearAll")}
      </button>
    </div>
  );
}
