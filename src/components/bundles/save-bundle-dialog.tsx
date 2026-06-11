"use client";

import { FolderPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/lib/cart-store";

type SaveBundleDialogProps = {
  triggerClassName?: string;
};

export function SaveBundleDialog({ triggerClassName }: SaveBundleDialogProps) {
  const t = useTranslations("bundles");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const items = useCartStore((state) => state.items);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("nameRequired"));
      return;
    }

    if (items.length === 0) {
      setError(t("cartEmpty"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          package_ids: items.map((item) => item.id),
          is_public: isPublic,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? tCommon("error"));
        return;
      }

      setOpen(false);
      setName("");
      setDescription("");
      setIsPublic(false);
      router.push(`/bundles/${data.slug}`);
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className={triggerClassName ?? "min-h-11"}>
            <FolderPlus />
            {t("saveFromCart")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("saveDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("saveDialogDescription", { count: items.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label htmlFor="bundle-name" className="text-sm font-medium">
              {t("nameLabel")}
            </label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={saving}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="bundle-description" className="text-sm font-medium">
              {t("descriptionLabel")}
            </label>
            <Textarea
              id="bundle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              disabled={saving}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={saving}
              className="size-4 rounded border-input"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t("publicLabel")}</span>
              <p className="text-xs text-muted-foreground">
                {t("publicDescription")}
              </p>
            </div>
          </label>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || items.length === 0}
          >
            {saving ? tCommon("loading") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
