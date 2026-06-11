"use client";

import { useLocale, useTranslations } from "next-intl";

import { CartBadge } from "@/components/store/home-sections";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";

const navItems = [
  { href: "/", key: "home" as const },
  { href: "/store", key: "store" as const },
  { href: "/cart", key: "cart" as const },
  { href: "/bundles", key: "bundles" as const },
  { href: "/help", key: "help" as const },
];

const skipLinkLabels: Record<string, string> = {
  en: "Skip to main content",
  "pt-BR": "Pular para o conteúdo principal",
};

export function Header() {
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tHeader = useTranslations("header");
  const pathname = usePathname();
  const skipLabel = skipLinkLabels[locale] ?? skipLinkLabels.en;

  return (
    <>
      <a href="#main-content" className="skip-link">
        {skipLabel}
      </a>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          aria-label={tHeader("logoLabel")}
        >
          EasyWinGet
        </Link>

        <nav
          aria-label={tHeader("mainNav")}
          className="flex flex-1 items-center gap-1 overflow-x-auto"
        >
          <ul className="flex items-center gap-1">
            {navItems.map(({ href, key }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);

              return (
                <li key={key}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
                  >
                    {tNav(key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <CartBadge />
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
    </>
  );
}
