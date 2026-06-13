import { Boxes, Code, Palette, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { HomeSearchBar } from "@/components/store/home-search-bar";
import { CategoryChips } from "@/components/store/home-sections";
import { PackageCard } from "@/components/store/package-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCategories, getFeaturedPackages } from "@/lib/packages/queries";
import type { Package } from "@/lib/packages/types";

type Kit = {
  id: string;
  icon: LucideIcon;
  categories: string[];
};

// Kits curados a partir de categorias da taxonomia. Cada kit linka para a
// loja pré-filtrada (multi-categoria via CSV) e lista alguns apps populares
// daquela área, derivados dos destaques já carregados (sem query extra).
const KITS: Kit[] = [
  {
    id: "developer",
    icon: Code,
    categories: ["developer-tools", "terminal-shell", "programming-languages"],
  },
  {
    id: "creator",
    icon: Palette,
    categories: ["graphics-design", "video", "audio-music", "photography", "multimedia"],
  },
  {
    id: "essentials",
    icon: Boxes,
    categories: ["browsers", "productivity", "communication", "utilities", "security-privacy"],
  },
];

function pickKitApps(pool: Package[], kit: Kit, limit = 4): Package[] {
  return pool
    .filter((pkg) => pkg.categories?.some((category) => kit.categories.includes(category)))
    .slice(0, limit);
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const [featuredPool, categories] = await Promise.all([
    getFeaturedPackages(30),
    getCategories(),
  ]);

  const featured = featuredPool.slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-20 md:gap-24">
      {/* Hero editorial */}
      <section className="flex max-w-3xl flex-col items-start gap-6">
        <span className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t("heroEyebrow")}
        </span>

        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t("heroHeadline")}
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          {t("heroDescription")}
        </p>

        <div className="w-full space-y-5 pt-2">
          <HomeSearchBar />

          <div className="flex flex-wrap items-center gap-3">
            <Button render={<Link href="/store" />} className="min-h-11 px-6">
              {t("getStarted")}
            </Button>
            <Button
              render={<Link href="/help" />}
              variant="outline"
              className="min-h-11 px-6"
            >
              {t("secondaryCta")}
            </Button>
          </div>
        </div>
      </section>

      {/* Kits populares — substitui o antigo terminal */}
      <section aria-labelledby="home-kits-heading" className="space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2
            id="home-kits-heading"
            className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-foreground"
          >
            {t("kitsTitle")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">{t("kitsSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {KITS.map((kit) => {
            const apps = pickKitApps(featuredPool, kit);
            const Icon = kit.icon;
            const href = `/store?category=${encodeURIComponent(kit.categories.join(","))}`;

            return (
              <Link
                key={kit.id}
                href={href}
                className="group flex flex-col gap-4 rounded-md border bg-card p-6 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex size-11 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>

                <div className="space-y-1.5">
                  <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-foreground">
                    {t(`kits.${kit.id}.name`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`kits.${kit.id}.description`)}
                  </p>
                </div>

                {apps.length > 0 && (
                  <div className="mt-auto space-y-2 pt-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("kitIncludes")}
                    </p>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-foreground">
                      {apps.map((pkg) => (
                        <li
                          key={pkg.id}
                          className="border-b border-transparent transition-colors group-hover:border-primary/40"
                        >
                          {pkg.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">
                  {t("exploreKit")}
                  <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Lista editorial de categorias */}
      <CategoryChips categories={categories} />

      {/* Destaques */}
      <section aria-labelledby="home-featured-heading" className="space-y-8">
        <div className="flex items-end justify-between gap-4 border-b pb-5">
          <div className="space-y-1.5">
            <h2
              id="home-featured-heading"
              className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-foreground"
            >
              {t("featured")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("featuredSubtitle")}</p>
          </div>
          <Button render={<Link href="/store" />} variant="outline" className="min-h-11 shrink-0">
            {t("viewAll")}
          </Button>
        </div>

        {featured.length === 0 ? (
          <p className="rounded-md border border-dashed px-6 py-12 text-center text-muted-foreground">
            {t("noFeatured")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
