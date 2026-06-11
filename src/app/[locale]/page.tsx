import { getTranslations } from "next-intl/server";

import { HomeSearchBar } from "@/components/store/home-search-bar";
import { CategoryChips } from "@/components/store/home-sections";
import { PackageCard } from "@/components/store/package-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCategories, getFeaturedPackages } from "@/lib/packages/queries";

export default async function HomePage() {
  const t = await getTranslations("home");
  const [featured, categories] = await Promise.all([
    getFeaturedPackages(6),
    getCategories(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <HomeSearchBar />
        <Button render={<Link href="/store" />} className="min-h-11 px-6">
          {t("getStarted")}
        </Button>
      </section>

      <CategoryChips categories={categories} />

      <section aria-labelledby="home-featured-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="home-featured-heading" className="text-2xl font-semibold">
            {t("featured")}
          </h2>
          <Button
            render={<Link href="/store" />}
            variant="outline"
            className="min-h-11"
          >
            {t("viewAll")}
          </Button>
        </div>

        {featured.length === 0 ? (
          <p className="rounded-xl border border-dashed px-6 py-12 text-center text-muted-foreground">
            {t("noFeatured")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
