"use client";

import { useTranslations } from "next-intl";

import { InstallListSidebarContent } from "@/components/cart/install-list-sidebar-content";
import { useCartStore } from "@/lib/cart-store";

export function InstallListSidebarDocked() {
  const t = useTranslations("cart");
  const items = useCartStore((state) => state.items);

  return (
    <aside
      className="fixed bottom-0 right-0 top-16 z-40 hidden w-96 flex-col border-l bg-card lg:flex"
      aria-label={t("title")}
    >
      <div className="border-b px-6 py-5">
        <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("itemCount", { count: items.length })}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <InstallListSidebarContent showPinControls />
      </div>
    </aside>
  );
}
