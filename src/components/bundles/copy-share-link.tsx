"use client";

import { Check, Link2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyShareLinkProps = {
  slug: string;
  isPublic: boolean;
};

export function CopyShareLink({ slug, isPublic }: CopyShareLinkProps) {
  const t = useTranslations("bundles");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  if (!isPublic) {
    return null;
  }

  const handleCopy = async () => {
    const url = `${window.location.origin}/${locale}/bundles/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-9"
      onClick={handleCopy}
    >
      {copied ? <Check /> : <Link2 />}
      {copied ? t("linkCopied") : t("copyLink")}
    </Button>
  );
}
