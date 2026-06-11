import type { GuiStrings, ScriptLocale } from "./types";

const GUI_STRINGS: Record<ScriptLocale, GuiStrings> = {
  "pt-BR": {
    title: "EasyWinGet - Instalador",
    installAll: "Instalar todos",
    cancel: "Cancelar",
    viewLog: "Ver log",
    confirm: "Deseja instalar {0} aplicativo(s)?",
    wingetMissing:
      "WinGet não encontrado. Instale o App Installer pela Microsoft Store.",
    installing: "Instalando",
    success: "Concluído",
    failed: "Falhou",
    pending: "Pendente",
    logTitle: "Log de instalação",
    completed: "Instalação concluída.",
    packageList: "Pacotes selecionados",
  },
  en: {
    title: "EasyWinGet - Installer",
    installAll: "Install all",
    cancel: "Cancel",
    viewLog: "View log",
    confirm: "Install {0} application(s)?",
    wingetMissing:
      "WinGet was not found. Install App Installer from the Microsoft Store.",
    installing: "Installing",
    success: "Done",
    failed: "Failed",
    pending: "Pending",
    logTitle: "Installation log",
    completed: "Installation complete.",
    packageList: "Selected packages",
  },
};

export function getGuiStrings(locale: ScriptLocale): GuiStrings {
  return GUI_STRINGS[locale];
}

export function isScriptLocale(value: string): value is ScriptLocale {
  return value === "pt-BR" || value === "en";
}
