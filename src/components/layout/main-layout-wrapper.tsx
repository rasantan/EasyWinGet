"use client";

import { InstallListSidebarDocked } from "@/components/cart/install-list-sidebar-docked";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

type MainLayoutWrapperProps = {
  children: React.ReactNode;
};

export function MainLayoutWrapper({ children }: MainLayoutWrapperProps) {
  const isPinned = useCartStore((state) => state.isPinned);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const showDocked = isPinned && isLargeScreen;

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col transition-[margin] duration-300",
        showDocked && "lg:mr-96",
      )}
    >
      {children}
      {showDocked ? <InstallListSidebarDocked /> : null}
    </div>
  );
}
