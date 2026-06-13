"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FavoriteButton } from "@/components/bundles/favorite-button";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Link } from "@/i18n/navigation";
import { PackageIcon } from "@/components/store/package-icon";
import {
  formatCategoryLabel,
  getCategoryIcon,
} from "@/lib/packages/category-icon";
import type { Package } from "@/lib/packages/types";

type PackageCardProps = {
  pkg: Package;
};

export function PackageCard({ pkg }: PackageCardProps) {
  const primaryCategory = pkg.categories[0] ?? "utilities";
  const CategoryIcon = getCategoryIcon(primaryCategory);

  return (
    <Card className="group flex h-full flex-col rounded-lg border bg-card shadow-sm transition-colors duration-200 hover:border-primary/40">
      <CardHeader className="flex flex-row items-start gap-4 p-5 pb-3">
        <PackageIcon
          iconUrl={pkg.icon_url}
          category={primaryCategory}
          className="transition-colors duration-200 group-hover:border-primary/30"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="font-[family-name:var(--font-heading)] line-clamp-2 text-[16px] leading-snug font-semibold">
            <Link
              href={`/store/${encodeURIComponent(pkg.package_id)}`}
              className="rounded-sm transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {pkg.name}
            </Link>
          </CardTitle>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {pkg.publisher}
          </p>
        </div>
        <FavoriteButton packageUuid={pkg.id} packageName={pkg.name} />
      </CardHeader>

      <CardContent className="flex-1 px-5 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <CategoryIcon className="size-3.5" aria-hidden="true" />
            {formatCategoryLabel(primaryCategory)}
          </span>
          {pkg.version && (
            <span className="inline-flex items-center rounded-md border border-primary/30 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              v{pkg.version}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-3">
        <AddToCartButton
          pkg={pkg}
          className="w-full sm:w-full transition-transform active:scale-95 duration-200"
        />
      </CardFooter>
    </Card>
  );
}
