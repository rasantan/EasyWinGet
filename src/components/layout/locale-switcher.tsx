"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locale");

  const otherLocale = routing.locales.find((l) => l !== locale) ?? "en";

  const handleSwitch = () => {
    router.replace(pathname, { locale: otherLocale });
  };

  return (
    <Button
      variant="outline"
      size="lg"
      aria-label={t("switchTo", {
        locale: t(otherLocale === "pt-BR" ? "ptBR" : "en"),
      })}
      onClick={handleSwitch}
    >
      {t(otherLocale === "pt-BR" ? "ptBR" : "en")}
    </Button>
  );
}
