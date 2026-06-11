import { Eye, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

const beginnerFeatures = ["feature1", "feature2", "feature3"] as const;
const advancedFeatures = ["feature1", "feature2", "feature3"] as const;

export async function ModeExplainer() {
  const t = await getTranslations("help.mode");

  return (
    <section aria-labelledby="mode-explainer-heading" className="space-y-4">
      <div className="space-y-2">
        <h2 id="mode-explainer-heading" className="text-2xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-lg text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <Badge variant="default">{t("beginner.badge")}</Badge>
            </div>
            <h3 className="text-xl font-medium leading-snug">{t("beginner.title")}</h3>
            <CardDescription className="text-base">
              {t("beginner.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-base" aria-label={t("beginner.title")}>
              {beginnerFeatures.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-primary">
                    ✓
                  </span>
                  <span>{t(`beginner.${feature}`)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="size-5 shrink-0" aria-hidden="true" />
              <Badge variant="secondary">{t("advanced.badge")}</Badge>
            </div>
            <h3 className="text-xl font-medium leading-snug">{t("advanced.title")}</h3>
            <CardDescription className="text-base">
              {t("advanced.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-base" aria-label={t("advanced.title")}>
              {advancedFeatures.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-muted-foreground">
                    ✓
                  </span>
                  <span>{t(`advanced.${feature}`)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
