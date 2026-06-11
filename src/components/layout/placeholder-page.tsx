"use client";

import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlaceholderPageProps = {
  namespace: "store" | "cart" | "bundles" | "help";
};

export function PlaceholderPage({ namespace }: PlaceholderPageProps) {
  const t = useTranslations(`pages.${namespace}`);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center p-6 sm:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
