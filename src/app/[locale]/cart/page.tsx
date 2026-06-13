"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";

export default function CartPageRedirect() {
  const router = useRouter();
  const setOpen = useCartStore((state) => state.setOpen);

  useEffect(() => {
    setOpen(true);
    router.replace("/store");
  }, [router, setOpen]);

  return null;
}
