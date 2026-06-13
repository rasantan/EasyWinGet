import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PackageSummary } from "@/lib/packages/types";

type CartStore = {
  items: PackageSummary[];
  isOpen: boolean;
  isPinned: boolean;
  autoOpen: boolean;
  badgePulse: boolean;
  add: (pkg: PackageSummary) => void;
  remove: (packageId: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  togglePinned: () => void;
  toggleAutoOpen: () => void;
  clearBadgePulse: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isPinned: false,
      autoOpen: true,
      badgePulse: false,
      add: (pkg) => {
        const { items, autoOpen, isPinned } = get();
        const nextItems = [
          ...items.filter((i) => i.package_id !== pkg.package_id),
          pkg,
        ];

        if (isPinned) {
          set({ items: nextItems, badgePulse: false });
          return;
        }

        if (autoOpen) {
          set({ items: nextItems, isOpen: true, badgePulse: false });
          return;
        }

        set({ items: nextItems, badgePulse: true });
      },
      remove: (packageId) =>
        set({
          items: get().items.filter((i) => i.package_id !== packageId),
        }),
      clear: () => set({ items: [] }),
      setOpen: (open) =>
        set({
          isOpen: open,
          badgePulse: open ? false : get().badgePulse,
        }),
      togglePinned: () => {
        const nextPinned = !get().isPinned;
        set({
          isPinned: nextPinned,
          isOpen: nextPinned ? false : get().isOpen,
        });
      },
      toggleAutoOpen: () => set({ autoOpen: !get().autoOpen }),
      clearBadgePulse: () => set({ badgePulse: false }),
    }),
    {
      name: "winstack-cart",
      partialize: (state) => ({
        items: state.items,
        isPinned: state.isPinned,
        autoOpen: state.autoOpen,
      }),
    },
  ),
);
