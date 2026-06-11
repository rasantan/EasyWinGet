import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PackageSummary } from "@/lib/packages/types";

type CartStore = {
  items: PackageSummary[];
  add: (pkg: PackageSummary) => void;
  remove: (packageId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (pkg) =>
        set({
          items: [
            ...get().items.filter((i) => i.package_id !== pkg.package_id),
            pkg,
          ],
        }),
      remove: (packageId) =>
        set({
          items: get().items.filter((i) => i.package_id !== packageId),
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "easywinget-cart" },
  ),
);
