import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

const termsSections = ["use", "asIs", "responsibility", "thirdParty"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("terms");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-12 space-y-4">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-medium tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </header>

      <div className="space-y-12">
        {termsSections.map((section) => (
          <section key={section} className="space-y-3">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-medium leading-snug">
              {t(`sections.${section}.title`)}
            </h2>
            <p className="text-base leading-relaxed text-foreground/90">
              {t(`sections.${section}.body`)}
            </p>
          </section>
        ))}

        <aside
          aria-labelledby="terms-cta-heading"
          className="rounded-xl border bg-muted/40 p-6 text-center"
        >
          <h2
            id="terms-cta-heading"
            className="font-[family-name:var(--font-heading)] text-xl font-medium"
          >
            {t("cta.title")}
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            {t("cta.description")}
          </p>
          <Link
            href="/store"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("cta.button")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
