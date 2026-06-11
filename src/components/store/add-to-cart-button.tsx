"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import type { Package } from "@/lib/packages/types";

type AddToCartButtonProps = {
  pkg: Package;
};

export function AddToCartButton({ pkg }: AddToCartButtonProps) {
  const t = useTranslations("package");
  const tCommon = useTranslations("common");
  const add = useCartStore((state) => state.add);
  const isInCart = useCartStore((state) =>
    state.items.some((item) => item.package_id === pkg.package_id),
  );

  const handleAdd = () => {
    add({
      id: pkg.id,
      package_id: pkg.package_id,
      name: pkg.name,
      publisher: pkg.publisher,
      version: pkg.version,
      categories: pkg.categories,
      installer_type: pkg.installer_type,
    });
  };

  return (
    <Button
      type="button"
      className="min-h-11 w-full sm:w-auto"
      onClick={handleAdd}
      disabled={isInCart}
      aria-label={t("addToCartNamed", { name: pkg.name })}
    >
      {isInCart ? t("inCart") : tCommon("add")}
    </Button>
  );
}
