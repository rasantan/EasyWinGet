"use client";

import { useTranslations } from "next-intl";

import { SaveBundleDialog } from "@/components/bundles/save-bundle-dialog";
import { ScriptActions } from "@/components/cart/script-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatCategoryLabel } from "@/lib/packages/category-icon";

export default function CartPage() {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <Card>
          <CardHeader className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <CardDescription>{t("empty.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button render={<Link href="/store" />} className="min-h-11 px-6">
              {t("empty.browseStore")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("itemCount", { count: items.length })}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={clear}
        >
          {t("clearAll")}
        </Button>
      </header>

      <ul className="space-y-3" aria-label={t("title")}>
        {items.map((item) => (
          <li key={item.package_id}>
            <Card>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/store/${encodeURIComponent(item.package_id)}`}
                    className="text-lg font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.publisher}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.categories.slice(0, 2).map((category) => (
                      <Badge key={category} variant="secondary">
                        {formatCategoryLabel(category)}
                      </Badge>
                    ))}
                    <Badge variant="outline">v{item.version}</Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-11 shrink-0"
                  onClick={() => remove(item.package_id)}
                  aria-label={t("removeNamed", { name: item.name })}
                >
                  {tCommon("remove")}
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-6">
        <ScriptActions
          items={items.map((item) => ({
            id: item.id,
            package_id: item.package_id,
            name: item.name,
            version: item.version,
          }))}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <SaveBundleDialog />
          <Button render={<Link href="/store" />} variant="outline" className="min-h-11">
            {t("continueShopping")}
          </Button>
        </div>
      </div>
    </div>
  );
}
