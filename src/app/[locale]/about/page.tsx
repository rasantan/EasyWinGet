import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

const howSteps = ["step1", "step2", "step3"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

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
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-medium leading-snug">
            {t("sections.what.title")}
          </h2>
          <p className="text-base leading-relaxed text-foreground/90">
            {t("sections.what.body")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-medium leading-snug">
            {t("sections.why.title")}
          </h2>
          <p className="text-base leading-relaxed text-foreground/90">
            {t("sections.why.body")}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-medium leading-snug">
            {t("sections.how.title")}
          </h2>
          <p className="text-base leading-relaxed text-foreground/90">
            {t("sections.how.body")}
          </p>
          <ol className="space-y-3 text-base leading-relaxed">
            {howSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5 text-foreground/90">
                  {t(`sections.how.${step}`)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-medium leading-snug">
            {t("sections.openSource.title")}
          </h2>
          <p className="text-base leading-relaxed text-foreground/90">
            {t("sections.openSource.body")}
          </p>
        </section>

        <aside
          aria-labelledby="about-cta-heading"
          className="rounded-xl border bg-muted/40 p-6 text-center"
        >
          <h2
            id="about-cta-heading"
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
