"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatCategoryLabel } from "@/lib/packages/category-icon";

export function CartBadge() {
  const t = useTranslations("cart");
  const count = useCartStore((state) => state.items.length);

  if (count === 0) {
    return null;
  }

  return (
    <Link
      href="/cart"
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={t("badgeLabel", { count })}
    >
      {t("navLabel")}
      <Badge
        variant="default"
        className="absolute -top-1 -right-1 size-5 justify-center p-0 text-xs"
        aria-hidden
      >
        {count > 99 ? "99+" : count}
      </Badge>
    </Link>
  );
}

export function CategoryChips({ categories }: { categories: string[] }) {
  const t = useTranslations("home");

  if (categories.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="home-categories-heading" className="space-y-3">
      <h2 id="home-categories-heading" className="text-lg font-semibold">
        {t("categories")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link
            key={category}
            href={`/store?category=${encodeURIComponent(category)}`}
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {formatCategoryLabel(category)}
          </Link>
        ))}
      </div>
    </section>
  );
}
