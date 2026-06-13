import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FavoriteButton } from "@/components/bundles/favorite-button";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PackageIcon } from "@/components/store/package-icon";
import { formatCategoryLabel } from "@/lib/packages/category-icon";
import { getPackageByPackageId } from "@/lib/packages/queries";

type PackageDetailPageProps = {
  params: Promise<{ packageId: string; locale: string }>;
};

export default async function PackageDetailPage({
  params,
}: PackageDetailPageProps) {
  const { packageId: rawPackageId } = await params;
  const packageId = decodeURIComponent(rawPackageId);

  const pkg = await getPackageByPackageId(packageId);

  if (!pkg) {
    notFound();
  }

  const t = await getTranslations("package");
  const tCommon = await getTranslations("common");
  const primaryCategory = pkg.categories[0] ?? "utilities";

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <Button
          render={<Link href="/store" />}
          variant="ghost"
          className="min-h-11 -ml-2"
        >
          {tCommon("back")}
        </Button>
      </div>

      <article className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <PackageIcon
            iconUrl={pkg.icon_url}
            category={primaryCategory}
            size="md"
            className="bg-muted"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{pkg.name}</h1>
            <p className="text-lg text-muted-foreground">{pkg.publisher}</p>
            <div className="flex flex-wrap gap-2">
              {pkg.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {formatCategoryLabel(category)}
                </Badge>
              ))}
            </div>
          </div>
        </header>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("description")}
          </h2>
          <p className="text-base leading-relaxed">
            {pkg.description_full ?? pkg.description}
          </p>
        </section>

        <dl className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">{t("version")}</dt>
            <dd className="font-medium">{pkg.version}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("packageId")}</dt>
            <dd className="font-mono text-sm">{pkg.package_id}</dd>
          </div>
          {pkg.installer_type ? (
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("installerType")}
              </dt>
              <dd className="font-medium">{pkg.installer_type}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AddToCartButton pkg={pkg} />
          <FavoriteButton
            packageUuid={pkg.id}
            packageName={pkg.name}
            size="icon"
          />
        </div>
      </article>
    </div>
  );
}
