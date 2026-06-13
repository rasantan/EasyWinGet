"use client";

import { useTranslations } from "next-intl";

import { InstallListSidebarContent } from "@/components/cart/install-list-sidebar-content";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCartStore } from "@/lib/cart-store";

export function InstallListSidebar() {
  const t = useTranslations("cart");
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const isPinned = useCartStore((state) => state.isPinned);
  const setOpen = useCartStore((state) => state.setOpen);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const showSheet = isOpen && (!isPinned || !isLargeScreen);

  return (
    <Sheet open={showSheet} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col border-l bg-card p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight">
            {t("title")}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {t("itemCount", { count: items.length })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <InstallListSidebarContent
            onNavigate={() => setOpen(false)}
            onClose={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
