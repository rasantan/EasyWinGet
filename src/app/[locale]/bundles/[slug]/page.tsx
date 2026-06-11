import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AddBundleToCartButton } from "@/components/bundles/add-bundle-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getBundleBySlug } from "@/lib/bundles/queries";
import type { PackageSummary } from "@/lib/packages/types";

type SharedBundlePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SharedBundlePage({
  params,
}: SharedBundlePageProps) {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);

  if (!bundle) {
    notFound();
  }

  const t = await getTranslations("bundles");
  const tCommon = await getTranslations("common");

  const sortedItems = [...bundle.bundle_items].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const cartItems: PackageSummary[] = sortedItems
    .filter((item) => item.packages)
    .map((item) => {
      const pkg = item.packages!;
      return {
        id: pkg.id,
        package_id: pkg.package_id,
        name: pkg.name,
        publisher: pkg.publisher,
        version: pkg.version,
        categories: pkg.categories,
        installer_type: pkg.installer_type,
      };
    });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <Button
          render={<Link href="/bundles" />}
          variant="ghost"
          className="min-h-11 -ml-2"
        >
          {tCommon("back")}
        </Button>
      </div>

      <header className="mb-8 space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{bundle.name}</h1>
            {bundle.description ? (
              <p className="text-muted-foreground">{bundle.description}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t("itemCount", { count: sortedItems.length })}
            </p>
          </div>
          <AddBundleToCartButton items={cartItems} />
        </div>
        {bundle.is_public ? (
          <Badge variant="secondary">{t("publicBadge")}</Badge>
        ) : null}
      </header>

      {sortedItems.length === 0 ? (
        <p className="text-muted-foreground">{t("emptyBundle")}</p>
      ) : (
        <ul className="space-y-3" aria-label={bundle.name}>
          {sortedItems.map((item) => {
            const pkg = item.packages;
            if (!pkg) {
              return null;
            }

            return (
              <li key={item.package_id}>
                <article className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/store/${encodeURIComponent(pkg.package_id)}`}
                      className="text-lg font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                    >
                      {pkg.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {pkg.publisher}
                    </p>
                  </div>
                  <Badge variant="outline">{pkg.version}</Badge>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
