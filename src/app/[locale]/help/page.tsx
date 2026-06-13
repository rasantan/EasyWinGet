import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InstallWizard } from "@/components/help/install-wizard";
import { ModeExplainer } from "@/components/help/mode-explainer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

const APP_INSTALLER_URL =
  "https://apps.microsoft.com/detail/9NBLGGH4NNS1";

const tocSections = [
  { id: "what-is", key: "whatIs" },
  { id: "download-run", key: "downloadRun" },
  { id: "motw", key: "motw" },
  { id: "install-winget", key: "installWinget" },
  { id: "notepad", key: "notepad" },
] as const;

const whatIsPoints = ["point1", "point2", "point3"] as const;
const downloadRunSteps = ["step1", "step2", "step3", "step4", "step5"] as const;
const motwSteps = ["step1", "step2", "step3", "step4", "step5"] as const;
const installWingetSteps = ["step1", "step2"] as const;
const notepadSteps = ["step1", "step2", "step3", "step4", "step5"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function NumberedSteps({
  steps,
  t,
  namespace,
}: {
  steps: readonly string[];
  t: Awaited<ReturnType<typeof getTranslations>>;
  namespace: string;
}) {
  return (
    <ol className="space-y-3 text-base leading-relaxed">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <span className="pt-0.5">{t(`${namespace}.${step}`)}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function HelpPage() {
  const t = await getTranslations("help");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        <InstallWizard />
        <ModeExplainer />

        <nav aria-label={t("tocLabel")}>
          <h2 className="mb-3 text-lg font-semibold">{t("tocHeading")}</h2>
          <ul className="flex flex-wrap gap-2">
            {tocSections.map(({ id, key }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-11 items-center rounded-lg border px-4 text-base font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t(`toc.${key}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Card id="what-is" aria-labelledby="what-is-heading">
          <CardHeader>
            <h2 id="what-is-heading" className="text-2xl font-medium leading-snug">
              {t("sections.whatIs.title")}
            </h2>
            <CardDescription className="text-base leading-relaxed">
              {t("sections.whatIs.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-base leading-relaxed">
              {whatIsPoints.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden="true" className="text-primary">
                    •
                  </span>
                  <span>{t(`sections.whatIs.${point}`)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card id="download-run" aria-labelledby="download-run-heading">
          <CardHeader>
            <h2 id="download-run-heading" className="text-2xl font-medium leading-snug">
              {t("sections.downloadRun.title")}
            </h2>
            <CardDescription className="text-base leading-relaxed">
              {t("sections.downloadRun.intro")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NumberedSteps
              steps={downloadRunSteps}
              t={t}
              namespace="sections.downloadRun"
            />
          </CardContent>
        </Card>

        <Card id="motw" aria-labelledby="motw-heading">
          <CardHeader>
            <h2 id="motw-heading" className="text-2xl font-medium leading-snug">
              {t("sections.motw.title")}
            </h2>
            <CardDescription className="text-base leading-relaxed">
              {t("sections.motw.intro")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberedSteps
              steps={motwSteps}
              t={t}
              namespace="sections.motw"
            />
            <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-base leading-relaxed">
              {t("sections.motw.tip")}
            </p>
          </CardContent>
        </Card>

        <Card id="install-winget" aria-labelledby="install-winget-heading">
          <CardHeader>
            <h2 id="install-winget-heading" className="text-2xl font-medium leading-snug">
              {t("sections.installWinget.title")}
            </h2>
            <CardDescription className="text-base leading-relaxed">
              {t("sections.installWinget.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberedSteps
              steps={installWingetSteps}
              t={t}
              namespace="sections.installWinget"
            />
            <p>
              <a
                href={APP_INSTALLER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("sections.installWinget.storeLinkLabel")}
                <span className="sr-only">{t("externalLinkHint")}</span>
              </a>
            </p>
            <p className="text-base text-muted-foreground">
              {t("sections.installWinget.note")}
            </p>
          </CardContent>
        </Card>

        <Card id="notepad" aria-labelledby="notepad-heading">
          <CardHeader>
            <h2 id="notepad-heading" className="text-2xl font-medium leading-snug">
              {t("sections.notepad.title")}
            </h2>
            <CardDescription className="text-base leading-relaxed">
              {t("sections.notepad.intro")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NumberedSteps
              steps={notepadSteps}
              t={t}
              namespace="sections.notepad"
            />
          </CardContent>
        </Card>

        <aside
          aria-labelledby="help-faq-link-heading"
          className="rounded-xl border bg-muted/40 p-6 text-center"
        >
          <h2 id="help-faq-link-heading" className="text-xl font-semibold">
            {t("faqLink.title")}
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            {t("faqLink.description")}
          </p>
          <Link
            href="/faq"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg border px-6 text-base font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("faqLink.button")}
          </Link>
        </aside>

        <aside
          aria-labelledby="help-cta-heading"
          className="rounded-xl border bg-muted/40 p-6 text-center"
        >
          <h2 id="help-cta-heading" className="text-xl font-semibold">
            {t("cta.title")}
          </h2>
          <p className="mt-2 text-base text-muted-foreground">{t("cta.description")}</p>
          <Link
            href="/store"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("cta.button")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
