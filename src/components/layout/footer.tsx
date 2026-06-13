import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

const REPO_URL = "https://github.com/rasantan/EasyWinGet";

export async function Footer() {
  const t = await getTranslations("footer");

  const footerLinks = [
    { href: "/about", key: "about" as const },
    { href: "/privacy", key: "privacy" as const },
    { href: "/terms", key: "terms" as const },
    { href: "/faq", key: "faq" as const },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-[family-name:var(--font-heading)] text-sm font-semibold tracking-tight">
          WinStack
        </p>

        <nav aria-label={t("navLabel")}>
          <ul className="flex flex-wrap items-center gap-2">
            {footerLinks.map(({ href, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("repo")}
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-sm text-muted-foreground">{t("copyright")}</p>
      </div>
    </footer>
  );
}
