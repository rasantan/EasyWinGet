"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import type { Package } from "@/lib/packages/types";
import { cn } from "@/lib/utils";

type AddToCartButtonProps = {
  pkg: Package;
  className?: string;
};

function toCartItem(pkg: Package) {
  return {
    id: pkg.id,
    package_id: pkg.package_id,
    name: pkg.name,
    publisher: pkg.publisher,
    version: pkg.version,
    categories: pkg.categories,
    installer_type: pkg.installer_type,
  };
}

export function AddToCartButton({ pkg, className }: AddToCartButtonProps) {
  const t = useTranslations("package");
  const tCommon = useTranslations("common");
  const add = useCartStore((state) => state.add);
  const remove = useCartStore((state) => state.remove);
  const isInCart = useCartStore((state) =>
    state.items.some((item) => item.package_id === pkg.package_id),
  );

  const handleClick = () => {
    if (isInCart) {
      remove(pkg.package_id);
      return;
    }
    add(toCartItem(pkg));
  };

  return (
    <Button
      type="button"
      variant={isInCart ? "secondary" : "default"}
      className={cn("min-h-11 w-full sm:w-auto", className)}
      onClick={handleClick}
      aria-pressed={isInCart}
      aria-label={
        isInCart
          ? t("removeFromCartNamed", { name: pkg.name })
          : t("addToCartNamed", { name: pkg.name })
      }
    >
      {isInCart ? tCommon("remove") : tCommon("add")}
    </Button>
  );
}
