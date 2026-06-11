import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");

  const footerLinks = [
    { href: "/help", key: "about" as const },
    { href: "/help", key: "privacy" as const },
    { href: "/help", key: "terms" as const },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm font-medium">EasyWinGet</p>

        <nav aria-label={t("navLabel")}>
          <ul className="flex flex-wrap gap-2">
            {footerLinks.map(({ href, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-sm text-muted-foreground">{t("copyright")}</p>
      </div>
    </footer>
  );
}
