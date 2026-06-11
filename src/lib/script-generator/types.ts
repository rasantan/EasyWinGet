export type ScriptLocale = "pt-BR" | "en";

export type ScriptPackage = {
  package_id: string;
  name: string;
  version: string;
};

export type ScriptManifest = {
  version: "1.0";
  locale: ScriptLocale;
  generated_at: string;
  bundle_name: string | null;
  packages: Array<{
    id: string;
    name: string;
    version: string;
  }>;
};

export type GenerateScriptInput = {
  packages: ScriptPackage[];
  locale: ScriptLocale;
  bundle_name?: string | null;
};

export type GenerateScriptResult = {
  script: string;
  hash: string;
};

export type GuiStrings = {
  title: string;
  installAll: string;
  cancel: string;
  viewLog: string;
  confirm: string;
  wingetMissing: string;
  installing: string;
  success: string;
  failed: string;
  pending: string;
  logTitle: string;
  completed: string;
  packageList: string;
};
