"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import type { PackageSummary } from "@/lib/packages/types";

type AddBundleToCartButtonProps = {
  items: PackageSummary[];
};

export function AddBundleToCartButton({ items }: AddBundleToCartButtonProps) {
  const t = useTranslations("bundles");
  const add = useCartStore((state) => state.add);

  if (items.length === 0) {
    return null;
  }

  const handleAddAll = () => {
    for (const item of items) {
      add(item);
    }
  };

  return (
    <Button
      type="button"
      className="min-h-11"
      onClick={handleAddAll}
      aria-label={t("addAllNamed", { count: items.length })}
    >
      {t("addAll", { count: items.length })}
    </Button>
  );
}
