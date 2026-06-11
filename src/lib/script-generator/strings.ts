import type { GuiStrings, ScriptLocale } from "./types";

const GUI_STRINGS: Record<ScriptLocale, GuiStrings> = {
  "pt-BR": {
    title: "EasyWinGet - Instalador",
    installAll: "Instalar todos",
    cancel: "Cancelar",
    close: "Fechar",
    viewLog: "Ver log",
    confirm: "Deseja instalar {0} aplicativo(s)?",
    wingetMissing:
      "WinGet não encontrado. Instale o App Installer pela Microsoft Store.",
    installing: "Instalando",
    success: "Concluído",
    alreadyInstalled: "Já instalado",
    failed: "Falhou",
    pending: "Pendente",
    logTitle: "Log de instalação",
    completed: "Instalação concluída.",
    packageList: "Pacotes selecionados",
    packageProgress: "Pacote {0} de {1}",
    summary: "{0} concluído(s), {1} falha(s).",
    downloadMetrics: "{0} / {1} · {2}/s",
    elapsedTime: "{0}s",
  },
  en: {
    title: "EasyWinGet - Installer",
    installAll: "Install all",
    cancel: "Cancel",
    close: "Close",
    viewLog: "View log",
    confirm: "Install {0} application(s)?",
    wingetMissing:
      "WinGet was not found. Install App Installer from the Microsoft Store.",
    installing: "Installing",
    success: "Done",
    alreadyInstalled: "Already installed",
    failed: "Failed",
    pending: "Pending",
    logTitle: "Installation log",
    completed: "Installation complete.",
    packageList: "Selected packages",
    packageProgress: "Package {0} of {1}",
    summary: "{0} succeeded, {1} failed.",
    downloadMetrics: "{0} / {1} · {2}/s",
    elapsedTime: "{0}s",
  },
};

export function getGuiStrings(locale: ScriptLocale): GuiStrings {
  return GUI_STRINGS[locale];
}

export function isScriptLocale(value: string): value is ScriptLocale {
  return value === "pt-BR" || value === "en";
}
