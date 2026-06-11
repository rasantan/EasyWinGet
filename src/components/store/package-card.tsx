"use client";

import { Badge } from "@/components/ui/badge";
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
    <Card className="flex h-full flex-col transition-colors hover:bg-muted/30">
      <CardHeader className="flex flex-row items-start gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted"
          aria-hidden
        >
          <CategoryIcon className="size-6 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="line-clamp-2 text-base leading-snug">
            <Link
              href={`/store/${encodeURIComponent(pkg.package_id)}`}
              className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {pkg.name}
            </Link>
          </CardTitle>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {pkg.publisher}
          </p>
        </div>
        <FavoriteButton packageUuid={pkg.id} packageName={pkg.name} />
      </CardHeader>
      <CardContent className="flex-1">
        <Badge variant="secondary" className="text-xs">
          {formatCategoryLabel(primaryCategory)}
        </Badge>
      </CardContent>
      <CardFooter>
        <AddToCartButton pkg={pkg} className="w-full sm:w-full" />
      </CardFooter>
    </Card>
  );
}
