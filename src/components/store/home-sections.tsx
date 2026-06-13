"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatCategoryLabel, getCategoryIcon } from "@/lib/packages/category-icon";

export function CartBadge() {
  const t = useTranslations("cart");
  const count = useCartStore((state) => state.items.length);
  const setOpen = useCartStore((state) => state.setOpen);
  const badgePulse = useCartStore((state) => state.badgePulse);
  const clearBadgePulse = useCartStore((state) => state.clearBadgePulse);
  const isPinned = useCartStore((state) => state.isPinned);

  const handleClick = () => {
    clearBadgePulse();
    if (!isPinned) {
      setOpen(true);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={t("badgeLabel", { count })}
    >
      {t("navLabel")}
      {count > 0 && (
        <Badge
          variant="default"
          className={`absolute -top-1 -right-1 size-5 justify-center p-0 text-xs font-bold ${
            badgePulse ? "animate-bounce ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
          }`}
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </button>
  );
}

export function CategoryChips({ categories }: { categories: string[] }) {
  const t = useTranslations("home");

  if (categories.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="home-categories-heading" className="space-y-5">
      <h2
        id="home-categories-heading"
        className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-foreground"
      >
        {t("categories")}
      </h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category);
          return (
            <li key={category}>
              <Link
                href={`/store?category=${encodeURIComponent(category)}`}
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icon
                  className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
                <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-primary">
                  {formatCategoryLabel(category)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
