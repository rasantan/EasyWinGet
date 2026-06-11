"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  invalidateFavoritesCache,
  loadFavoriteIds,
  setCachedFavorite,
} from "@/lib/favorites-cache";
import { cn } from "@/lib/utils";

type FavoriteButtonProps = {
  packageUuid: string;
  packageName: string;
  className?: string;
  size?: "icon-sm" | "icon";
};

export function FavoriteButton({
  packageUuid,
  packageName,
  className,
  size = "icon-sm",
}: FavoriteButtonProps) {
  const t = useTranslations("bundles");
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadFavoriteIds().then((ids) => {
      if (!cancelled) {
        setFavorited(ids.has(packageUuid));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [packageUuid]);

  const toggle = useCallback(async () => {
    if (pending) {
      return;
    }

    setPending(true);
    const next = !favorited;

    try {
      const response = await fetch(
        next
          ? "/api/favorites"
          : `/api/favorites?package_id=${encodeURIComponent(packageUuid)}`,
        next
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ package_id: packageUuid }),
            }
          : { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("favorite toggle failed");
      }

      setFavorited(next);
      setCachedFavorite(packageUuid, next);
    } catch {
      invalidateFavoritesCache();
      const ids = await loadFavoriteIds();
      setFavorited(ids.has(packageUuid));
    } finally {
      setPending(false);
    }
  }, [favorited, packageUuid, pending]);

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn("min-h-11 min-w-11 shrink-0", className)}
      onClick={toggle}
      disabled={loading || pending}
      aria-pressed={favorited}
      aria-label={
        favorited
          ? t("unfavoriteNamed", { name: packageName })
          : t("favoriteNamed", { name: packageName })
      }
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          favorited
            ? "fill-destructive text-destructive"
            : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
    </Button>
  );
}
