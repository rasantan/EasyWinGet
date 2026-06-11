import { getTranslations } from "next-intl/server";

import { BundleShareToggle } from "@/components/bundles/bundle-share-toggle";
import { CopyShareLink } from "@/components/bundles/copy-share-link";
import { SaveBundleDialog } from "@/components/bundles/save-bundle-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  getDownloadHistory,
  getUserBundles,
} from "@/lib/bundles/queries";
import { createClient } from "@/lib/supabase/server";

export default async function BundlesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("bundles");

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("authRequired")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const [bundles, history] = await Promise.all([
    getUserBundles(user.id),
    getDownloadHistory(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <SaveBundleDialog />
      </header>

      <section className="mb-10" aria-labelledby="bundles-heading">
        <h2 id="bundles-heading" className="mb-4 text-xl font-semibold">
          {t("myBundles")}
        </h2>

        {bundles.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("empty.title")}</CardTitle>
              <CardDescription>{t("empty.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/store" />} variant="outline">
                {t("empty.browseStore")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {bundles.map((bundle) => {
              const itemCount = bundle.bundle_items.length;

              return (
                <li key={bundle.id}>
                  <Card>
                    <CardHeader className="gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <CardTitle className="text-lg">
                            <Link
                              href={`/bundles/${bundle.slug}`}
                              className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              {bundle.name}
                            </Link>
                          </CardTitle>
                          {bundle.description ? (
                            <CardDescription>{bundle.description}</CardDescription>
                          ) : null}
                          <p className="text-sm text-muted-foreground">
                            {t("itemCount", { count: itemCount })}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CopyShareLink
                            slug={bundle.slug}
                            isPublic={bundle.is_public}
                          />
                          <BundleShareToggle
                            bundleId={bundle.id}
                            initialIsPublic={bundle.is_public}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    {itemCount > 0 ? (
                      <CardContent>
                        <ul className="flex flex-wrap gap-2">
                          {bundle.bundle_items
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .slice(0, 6)
                            .map((item) => (
                              <li key={item.package_id}>
                                <Badge variant="secondary">
                                  {item.packages?.name ?? item.package_id}
                                </Badge>
                              </li>
                            ))}
                          {itemCount > 6 ? (
                            <li>
                              <Badge variant="outline">
                                {t("moreItems", { count: itemCount - 6 })}
                              </Badge>
                            </li>
                          ) : null}
                        </ul>
                      </CardContent>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 text-xl font-semibold">
          {t("downloadHistory")}
        </h2>

        {history.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                {t("historyEmpty")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => (
              <li key={entry.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {entry.bundles?.name ?? t("unnamedDownload")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("historyPackages", {
                          count: entry.package_ids.length,
                        })}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {entry.script_hash.slice(0, 12)}…
                      </p>
                    </div>
                    <time
                      className="text-sm text-muted-foreground"
                      dateTime={entry.created_at}
                    >
                      {new Date(entry.created_at).toLocaleString()}
                    </time>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
