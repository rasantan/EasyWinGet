"use client";

import { useState } from "react";

import { getCategoryIcon } from "@/lib/packages/category-icon";
import { cn } from "@/lib/utils";

type PackageIconProps = {
  iconUrl: string | null;
  category: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "size-11",
  md: "size-16",
  lg: "size-20",
} as const;

const ICON_SIZE_CLASSES = {
  sm: "size-5.5",
  md: "size-8",
  lg: "size-10",
} as const;

export function PackageIcon({
  iconUrl,
  category,
  size = "sm",
  className,
}: PackageIconProps) {
  const [failed, setFailed] = useState(false);
  const CategoryIcon = getCategoryIcon(category);
  const showImage = Boolean(iconUrl) && !failed;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-500/10 bg-zinc-500/5 text-muted-foreground",
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl!}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <CategoryIcon className={ICON_SIZE_CLASSES[size]} />
      )}
    </div>
  );
}
