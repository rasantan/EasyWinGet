"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type BundleShareToggleProps = {
  bundleId: string;
  initialIsPublic: boolean;
};

export function BundleShareToggle({
  bundleId,
  initialIsPublic,
}: BundleShareToggleProps) {
  const t = useTranslations("bundles");
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pending, setPending] = useState(false);

  const handleToggle = async () => {
    if (pending) {
      return;
    }

    const next = !isPublic;
    setPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bundles")
        .update({ is_public: next })
        .eq("id", bundleId);

      if (error) {
        throw error;
      }

      setIsPublic(next);
    } catch {
      setIsPublic(isPublic);
    } finally {
      setPending(false);
    }
  };

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={isPublic}
        onChange={handleToggle}
        disabled={pending}
        className="size-4 rounded border-input"
        aria-label={t("publicLabel")}
      />
      <span>{t("publicLabel")}</span>
    </label>
  );
}
