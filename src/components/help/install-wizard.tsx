import { Download, Eye, ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  { key: "step1" as const, icon: ShoppingBag },
  { key: "step2" as const, icon: Eye },
  { key: "step3" as const, icon: Download },
] as const;

export async function InstallWizard() {
  const t = await getTranslations("help.wizard");

  return (
    <Card aria-labelledby="install-wizard-heading">
      <CardHeader>
        <h2 id="install-wizard-heading" className="text-2xl font-medium leading-snug">
          {t("title")}
        </h2>
        <CardDescription className="text-base">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol
          className="grid gap-6 sm:grid-cols-3"
          aria-label={t("ariaLabel")}
        >
          {steps.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              className="relative flex flex-col items-center gap-3 text-center"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-7 left-[calc(50%+2rem)] hidden h-0.5 w-[calc(100%-4rem)] bg-border sm:block"
                />
              ) : null}
              <span
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
                  "ring-4 ring-primary/20"
                )}
                aria-hidden="true"
              >
                <Icon className="size-7" strokeWidth={1.75} />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(`${key}.number`)}
                </p>
                <h3 className="text-lg font-semibold leading-snug">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-base text-muted-foreground">
                  {t(`${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
