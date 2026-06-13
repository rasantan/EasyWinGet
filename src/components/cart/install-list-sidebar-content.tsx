"use client";

import { Pin, PinOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { SaveBundleDialog } from "@/components/bundles/save-bundle-dialog";
import { ScriptActions } from "@/components/cart/script-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatCategoryLabel } from "@/lib/packages/category-icon";

type InstallListSidebarContentProps = {
  onNavigate?: () => void;
  onClose?: () => void;
  showPinControls?: boolean;
};

export function InstallListSidebarContent({
  onNavigate,
  onClose,
  showPinControls = true,
}: InstallListSidebarContentProps) {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);
  const isPinned = useCartStore((state) => state.isPinned);
  const autoOpen = useCartStore((state) => state.autoOpen);
  const togglePinned = useCartStore((state) => state.togglePinned);
  const toggleAutoOpen = useCartStore((state) => state.toggleAutoOpen);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showPinControls ? (
        <div className="border-b border-white/5 px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant={autoOpen ? "secondary" : "outline"}
              size="sm"
              className="min-h-9 text-xs"
              onClick={toggleAutoOpen}
              aria-pressed={autoOpen}
            >
              {t("autoOpen")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 gap-1.5"
              onClick={togglePinned}
              aria-pressed={isPinned}
            >
              {isPinned ? (
                <>
                  <PinOff className="size-4" />
                  {t("unpin")}
                </>
              ) : (
                <>
                  <Pin className="size-4" />
                  {t("pin")}
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trash2 className="size-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t("empty.description")}
          </p>
          {onClose ? (
            <Button onClick={onClose} className="mt-6 min-h-11">
              {t("empty.browseStore")}
            </Button>
          ) : (
            <Button
              render={<Link href="/store" />}
              className="mt-6 min-h-11"
            >
              {t("empty.browseStore")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ul
              className="divide-y animate-in fade-in slide-in-from-right-5 duration-300"
              aria-label={t("title")}
            >
              {items.map((item) => (
                <li
                  key={item.package_id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <Link
                      href={`/store/${encodeURIComponent(item.package_id)}`}
                      onClick={onNavigate}
                      className="block truncate rounded-sm text-base font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.publisher}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.categories.slice(0, 1).map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="h-5 bg-secondary/80 px-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground"
                        >
                          {formatCategoryLabel(category)}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className="h-5 px-2 text-[10px] font-semibold"
                      >
                        v{item.version}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(item.package_id)}
                    aria-label={t("removeNamed", { name: item.name })}
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="shrink-0 space-y-6 border-t border-white/5 bg-zinc-950/30 p-6">
            <ScriptActions
              items={items.map((item) => ({
                id: item.id,
                package_id: item.package_id,
                name: item.name,
                version: item.version,
              }))}
            />

            <div className="flex flex-col gap-3">
              <SaveBundleDialog triggerClassName="w-full min-h-11 justify-center" />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 flex-1"
                  onClick={clear}
                >
                  {t("clearAll")}
                </Button>
                {onClose ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 flex-1"
                    onClick={onClose}
                  >
                    {tCommon("close")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
