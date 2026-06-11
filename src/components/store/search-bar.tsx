"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "@/i18n/navigation";

type SearchBarProps = {
  defaultValue?: string;
  placeholder?: string;
};

export function SearchBar({
  defaultValue = "",
  placeholder,
}: SearchBarProps) {
  const t = useTranslations("store");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }

      params.delete("page");

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-1">
      <label htmlFor="store-search" className="sr-only">
        {tCommon("search")}
      </label>
      <Input
        id="store-search"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder ?? t("searchPlaceholder")}
        className="min-h-11 w-full text-base"
        onChange={(event) => {
          const value = event.target.value;

          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }

          debounceRef.current = setTimeout(() => {
            updateQuery(value);
          }, 350);
        }}
      />
    </div>
  );
}
