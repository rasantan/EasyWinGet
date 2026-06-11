"use client";

import { useTranslations } from "next-intl";
import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

export function HomeSearchBar() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();

    if (query) {
      router.push(`/store?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/store");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="home-search" className="sr-only">
            {tCommon("search")}
          </label>
          <Input
            id="home-search"
            type="search"
            name="q"
            placeholder={t("searchPlaceholder")}
            className="min-h-11 flex-1 text-base"
          />
        </div>
        <Button type="submit" className="min-h-11 px-6">
          {tCommon("search")}
        </Button>
      </div>
    </form>
  );
}
