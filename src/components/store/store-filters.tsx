"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { formatCategoryLabel } from "@/lib/packages/category-icon";

type StoreFiltersProps = {
  categories: string[];
  publishers: string[];
};

export function StoreFilters({ categories, publishers }: StoreFiltersProps) {
  const t = useTranslations("store");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "";
  const currentPublisher = searchParams.get("publisher") ?? "";

  const updateFilter = (key: "category" | "publisher", value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.delete("page");

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex w-full flex-col gap-1.5 sm:w-52">
        <label htmlFor="store-filter-category" className="text-sm font-medium">
          {t("filters.category")}
        </label>
        <Select
          value={currentCategory || "all"}
          onValueChange={(value) =>
            updateFilter("category", value === "all" ? null : value)
          }
        >
          <SelectTrigger id="store-filter-category" className="min-h-11 w-full">
            <SelectValue placeholder={t("filters.category")} />
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {formatCategoryLabel(category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-64">
        <label htmlFor="store-filter-publisher" className="text-sm font-medium">
          {t("filters.publisher")}
        </label>
        <Select
          value={currentPublisher || "all"}
          onValueChange={(value) =>
            updateFilter("publisher", value === "all" ? null : value)
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
    </div>
  );
}
