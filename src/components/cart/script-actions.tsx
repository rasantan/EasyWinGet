"use client";

import { Copy, Download, Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LAUNCHER_FILENAME } from "@/lib/script-generator/launcher";

export type ScriptCartItem = {
  id: string;
  package_id: string;
  name: string;
  version: string;
};

type ScriptActionsProps = {
  items: ScriptCartItem[];
  bundleName?: string;
};

type FetchScriptResult = {
  content: string;
  hash: string | null;
  filename: string;
};

function parseDownloadFilename(disposition: string | null): string {
  if (!disposition) {
    return LAUNCHER_FILENAME;
  }
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] ?? LAUNCHER_FILENAME;
}

async function fetchGeneratedScript(
  items: ScriptCartItem[],
  locale: string,
  bundleName?: string,
  format: "launcher" | "script" = "launcher",
): Promise<FetchScriptResult> {
  const response = await fetch("/api/script/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      package_ids: items.map((item) => item.id),
      locale,
      bundle_name: bundleName,
      format,
    }),
  });

  if (!response.ok) {
    let message = "Failed to generate script";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // Ignore JSON parse errors and use default message.
    }
    throw new Error(message);
  }

  const content = await response.text();
  return {
    content,
    hash: response.headers.get("X-Script-Hash"),
    filename: parseDownloadFilename(
      response.headers.get("Content-Disposition"),
    ),
  };
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ScriptActions({ items, bundleName }: ScriptActionsProps) {
  const t = useTranslations("script");
  const locale = useLocale();
  const [advancedMode, setAdvancedMode] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScript, setPreviewScript] = useState("");
  const [previewHash, setPreviewHash] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "download" | "copy" | "preview" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const disabled = items.length === 0 || loadingAction !== null;

  const runAction = useCallback(
    async (action: "download" | "copy" | "preview") => {
      setLoadingAction(action);
      setErrorMessage(null);
      setCopySuccess(false);

      try {
        const format = action === "download" ? "launcher" : "script";
        const { content, hash, filename } = await fetchGeneratedScript(
          items,
          locale,
          bundleName,
          format,
        );

        if (action === "download") {
          triggerDownload(content, filename);
        } else if (action === "copy") {
          await navigator.clipboard.writeText(content);
          setCopySuccess(true);
        } else {
          setPreviewScript(content);
          setPreviewHash(hash);
          setPreviewOpen(true);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : t("generateError"),
        );
      } finally {
        setLoadingAction(null);
      }
    },
    [bundleName, items, locale, t],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          className="min-h-11"
          disabled={disabled}
          onClick={() => runAction("download")}
        >
          <Download aria-hidden="true" />
          {loadingAction === "download" ? t("generating") : t("downloadInstaller")}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={disabled}
          onClick={() => runAction("copy")}
        >
          <Copy aria-hidden="true" />
          {loadingAction === "copy" ? t("generating") : t("copyScript")}
        </Button>

        {advancedMode ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            disabled={disabled}
            onClick={() => runAction("preview")}
          >
            <Eye aria-hidden="true" />
            {loadingAction === "preview" ? t("generating") : t("previewScript")}
          </Button>
        ) : null}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5 rounded border border-input accent-primary"
          checked={advancedMode}
          onChange={(event) => setAdvancedMode(event.target.checked)}
        />
        <span>{t("advancedMode")}</span>
      </label>

      {copySuccess ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t("copySuccess")}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("previewTitle")}</DialogTitle>
            <DialogDescription>
              {previewHash
                ? t("previewDescriptionWithHash", { hash: previewHash })
                : t("previewDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={previewScript}
            aria-label={t("previewTitle")}
            className="min-h-[50vh] font-mono text-xs"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
