"use client";

import { Copy, Download, Eye, CheckCircle2, ChevronRight, ChevronLeft, ShieldAlert } from "lucide-react";
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

// Localized content for the Setup Stepper Wizard
const STEPPER_CONTENT = {
  en: {
    title: "WinStack Setup Assistant",
    subtitle: "Follow these 3 simple steps to install your software stack safely.",
    step1Title: "1. Save Installer",
    step1Desc: "The file 'winstack-install.cmd' has been generated and downloaded to your computer.",
    step1Status: "Download started! Check your browser's download folder.",
    step2Title: "2. Unblock Windows Defender",
    step2Desc: "Because this is a generated setup script, Windows Defender SmartScreen may display a warning. To bypass this safely:",
    step2Bullet1: "Right-click the downloaded 'winstack-install.cmd' file and select Properties.",
    step2Bullet2: "In the General tab, look at the bottom Security section.",
    step2Bullet3: "Check the Unblock box and click Apply or OK.",
    step3Title: "3. Run & Deploy",
    step3Desc: "Double-click the 'winstack-install.cmd' file. A secure terminal window will open to install all selected apps automatically.",
    step3Note: "Note: Some applications may trigger a standard Windows UAC confirmation prompt (click Yes to authorize).",
    btnNext: "Next Step",
    btnBack: "Back",
    btnFinish: "Got it, install!",
    smartscreenTitle: "Windows Defender SmartScreen Info",
  },
  "pt-BR": {
    title: "Assistente de Implantação WinStack",
    subtitle: "Siga estes 3 passos simples para instalar o seu stack de software com segurança.",
    step1Title: "1. Salvar o Arquivo",
    step1Desc: "O arquivo 'winstack-install.cmd' foi gerado e baixado no seu computador.",
    step1Status: "Download iniciado! Verifique os downloads do seu navegador.",
    step2Title: "2. Desbloquear no Windows",
    step2Desc: "Por ser um instalador gerado dinamicamente, o Windows SmartScreen pode exibir um alerta. Para resolver:",
    step2Bullet1: "Clique com o botão direito no arquivo 'winstack-install.cmd' baixado e vá em Propriedades.",
    step2Bullet2: "Na aba Geral, veja a seção de Segurança no canto inferior.",
    step2Bullet3: "Marque a caixa Desbloquear (Unblock) e clique em Aplicar ou OK.",
    step3Title: "3. Executar e Instalar",
    step3Desc: "Dê dois cliques no arquivo 'winstack-install.cmd'. Uma janela de terminal segura se abrirá para realizar a instalação automatizada.",
    step3Note: "Nota: Alguns programas podem solicitar a confirmação padrão de administrador (UAC) do Windows (clique em Sim).",
    btnNext: "Próximo Passo",
    btnBack: "Voltar",
    btnFinish: "Entendi, instalar!",
    smartscreenTitle: "Alerta de Segurança do Windows",
  }
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
  const locale = useLocale() as "en" | "pt-BR";
  const contentMap = STEPPER_CONTENT[locale] || STEPPER_CONTENT.en;

  const [advancedMode, setAdvancedMode] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScript, setPreviewScript] = useState("");
  const [previewHash, setPreviewHash] = useState<string | null>(null);
  
  // Stepper state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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
          // Show the stepper wizard
          setCurrentStep(1);
          setWizardOpen(true);
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
          className="min-h-11 flex-1 transition-transform active:scale-95 duration-200"
          disabled={disabled}
          onClick={() => runAction("download")}
        >
          <Download className="mr-1.5 size-4" aria-hidden="true" />
          {loadingAction === "download" ? t("generating") : t("downloadInstaller")}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1 transition-transform active:scale-95 duration-200"
          disabled={disabled}
          onClick={() => runAction("copy")}
        >
          <Copy className="mr-1.5 size-4" aria-hidden="true" />
          {loadingAction === "copy" ? t("generating") : t("copyScript")}
        </Button>

        {advancedMode ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full mt-1.5 transition-transform active:scale-95 duration-200"
            disabled={disabled}
            onClick={() => runAction("preview")}
          >
            <Eye className="mr-1.5 size-4" aria-hidden="true" />
            {loadingAction === "preview" ? t("generating") : t("previewScript")}
          </Button>
        ) : null}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground select-none">
        <input
          type="checkbox"
          className="size-5 rounded border border-input accent-primary transition-all duration-200"
          checked={advancedMode}
          onChange={(event) => setAdvancedMode(event.target.checked)}
        />
        <span>{t("advancedMode")}</span>
      </label>

      {copySuccess ? (
        <p className="text-sm font-semibold text-primary flex items-center gap-1.5 animate-in fade-in" role="status">
          <CheckCircle2 className="size-4" /> {t("copySuccess")}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/5 rounded-lg px-3 py-2 animate-in slide-in-from-bottom-2" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {/* Script Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden border bg-card sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-heading)] text-lg font-semibold">{t("previewTitle")}</DialogTitle>
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
            className="min-h-[50vh] font-mono text-xs bg-muted border text-foreground"
          />
        </DialogContent>
      </Dialog>

      {/* Installation Assistant Stepper Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-xl overflow-hidden border bg-card p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-foreground">
              {contentMap.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {contentMap.subtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between my-6 px-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300" 
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            />
            
            {[1, 2, 3].map((stepNum) => (
              <div 
                key={stepNum} 
                className={`relative z-10 flex size-9 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                  currentStep >= stepNum 
                    ? "bg-primary border-primary text-primary-foreground scale-105" 
                    : "bg-muted border text-muted-foreground"
                }`}
              >
                {currentStep > stepNum ? <CheckCircle2 className="size-5" /> : stepNum}
              </div>
            ))}
          </div>

          {/* Stepper Content */}
          <div className="min-h-[180px] py-2">
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">{contentMap.step1Title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{contentMap.step1Desc}</p>
                <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-md px-4 py-3 text-primary text-xs font-medium">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{contentMap.step1Status}</span>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldAlert className="size-5 text-primary" />
                  <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold">{contentMap.step2Title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{contentMap.step2Desc}</p>
                
                {/* Visual Unblock Graphic Tooltip */}
                <div className="rounded-md border bg-muted p-4 font-mono text-xs text-muted-foreground space-y-2.5">
                  <div className="flex items-center justify-between border-b pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>winstack-install.cmd — Properties</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between border-b border-dashed pb-1">
                      <span>Type:</span> <span className="text-foreground">Windows Command Script (.cmd)</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1">
                      <span>Location:</span> <span className="text-foreground">C:\Users\Downloads</span>
                    </div>
                    <div className="flex items-center gap-2 border border-primary/30 bg-primary/10 rounded-md p-2 mt-2">
                      <input type="checkbox" checked readOnly className="accent-primary" />
                      <span className="text-foreground font-semibold leading-normal">
                        Security: Desbloquear / Unblock
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="text-xs space-y-1.5 text-muted-foreground list-decimal list-inside pl-1 leading-relaxed">
                  <li>{contentMap.step2Bullet1}</li>
                  <li>{contentMap.step2Bullet2}</li>
                  <li>{contentMap.step2Bullet3}</li>
                </ul>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">{contentMap.step3Title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{contentMap.step3Desc}</p>
                <div className="rounded-md border bg-muted p-4">
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-mono">
                    <span className="text-primary font-bold">$</span>
                    <span>winget import -i winstack-manifest.json</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium bg-muted border rounded-md p-3">
                  ⚠️ {contentMap.step3Note}
                </p>
              </div>
            )}
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((c) => Math.max(1, c - 1))}
            >
              <ChevronLeft className="mr-1 size-4" />
              {contentMap.btnBack}
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                className="min-h-11"
                onClick={() => setCurrentStep((c) => Math.min(3, c + 1))}
              >
                {contentMap.btnNext}
                <ChevronRight className="ml-1 size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-11 bg-primary text-primary-foreground"
                onClick={() => setWizardOpen(false)}
              >
                {contentMap.btnFinish}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
