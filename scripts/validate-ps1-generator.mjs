/**
 * Automated validation for EasyWinGet PS1 script generator (Task 5.7).
 * Imports generateScript from src via tsx loader (see npm script validate:ps1).
 *
 * Run: npm run validate:ps1
 */

import { generateScript } from "../src/lib/script-generator/generate.ts";
import { LAUNCHER_FILENAME } from "../src/lib/script-generator/launcher.ts";

const MOCK_PACKAGES = [
  { package_id: "Git.Git", name: "Git", version: "2.47.1" },
  { package_id: "7zip.7zip", name: "7-Zip", version: "24.09" },
];

const LOCALES = ["pt-BR", "en"];

/** @type {Array<{ label: string; test: (script: string, locale: string) => boolean }>} */
const ASSERTIONS = [
  {
    label: "$EasyWinGetManifest",
    test: (script) => script.includes("$EasyWinGetManifest"),
  },
  {
    label: "Unblock-File",
    test: (script) => script.includes("Unblock-File"),
  },
  {
    label: "winget install",
    test: (script) =>
      script.includes("'install'") &&
      script.includes("Invoke-WingetWithProgress"),
  },
  {
    label: "Invoke-WingetWithProgress",
    test: (script) => script.includes("function Invoke-WingetWithProgress"),
  },
  {
    label: "Get-WingetInstallOutcome",
    test: (script) =>
      script.includes("function Get-WingetInstallOutcome") &&
      script.includes("-1978335189") &&
      script.includes("-1978335135"),
  },
  {
    label: "close button string",
    test: (script, locale) =>
      locale === "pt-BR"
        ? script.includes("close = 'Fechar'")
        : script.includes("close = 'Close'"),
  },
  {
    label: "metrics label",
    test: (script) => script.includes("$metricsLabel"),
  },
  {
    label: "UTF-8 OutputEncoding",
    test: (script) => script.includes("[Console]::OutputEncoding"),
  },
  {
    label: "Segoe UI font",
    test: (script) => script.includes("Segoe UI"),
  },
  {
    label: "System.Windows.Forms",
    test: (script) => script.includes("System.Windows.Forms"),
  },
  {
    label: "package id Git.Git",
    test: (script) => script.includes("Git.Git"),
  },
  {
    label: "package id 7zip.7zip",
    test: (script) => script.includes("7zip.7zip"),
  },
  {
    label: "manifest JSON package ids",
    test: (script) =>
      script.includes('"id": "Git.Git"') &&
      script.includes('"id": "7zip.7zip"'),
  },
  {
    label: "SHA-256 hash embedded (not placeholder)",
    test: (script) => {
      const match = script.match(/SHA-256: ([a-f0-9]{64})/);
      return match !== null && !/^0{64}$/.test(match[1]);
    },
  },
];

const LAUNCHER_ASSERTIONS = [
  {
    label: "launcher filename constant",
    test: () => LAUNCHER_FILENAME === "easywinget-install.cmd",
  },
  {
    label: "embedded PS1 markers",
    test: (launcher) =>
      launcher.includes("::EWG_PS1_BEGIN") &&
      launcher.includes("::EWG_PS1_END"),
  },
  {
    label: "ExecutionPolicy Bypass",
    test: (launcher) => launcher.includes("-ExecutionPolicy Bypass"),
  },
  {
    label: "admin elevation (RunAs)",
    test: (launcher) => launcher.includes("-Verb RunAs"),
  },
  {
    label: "64-bit System32 powershell",
    test: (launcher) =>
      launcher.includes("System32\\WindowsPowerShell\\v1.0\\powershell.exe"),
  },
  {
    label: "self path for extraction",
    test: (launcher) => launcher.includes("EWG_SELF=%~f0"),
  },
  {
    label: "net session admin check",
    test: (launcher) => launcher.includes("net session"),
  },
];

const LOCALE_STRINGS = {
  "pt-BR": "EasyWinGet - Instalador",
  en: "EasyWinGet - Installer",
};

function validateLocale(locale) {
  const { script, launcher, hash } = generateScript({
    packages: MOCK_PACKAGES,
    locale,
    bundle_name: "Validate PS1",
  });

  const failures = [];

  if (typeof script !== "string" || script.length < 500) {
    failures.push("script output too short or missing");
  }

  if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
    failures.push("invalid hash in result");
  }

  for (const { label, test } of ASSERTIONS) {
    if (!test(script, locale)) {
      failures.push(`missing or invalid: ${label}`);
    }
  }

  const expectedTitle = LOCALE_STRINGS[locale];
  if (!script.includes(expectedTitle)) {
    failures.push(`missing locale GUI title: ${expectedTitle}`);
  }

  if (!script.includes(`"locale": "${locale}"`)) {
    failures.push(`manifest locale not set to ${locale}`);
  }

  if (typeof launcher !== "string" || launcher.length < script.length) {
    failures.push("launcher missing or smaller than embedded script");
  }

  for (const { label, test } of LAUNCHER_ASSERTIONS) {
    if (!test(launcher, locale)) {
      failures.push(`launcher: missing or invalid: ${label}`);
    }
  }

  if (!launcher.includes(hash)) {
    failures.push("launcher missing script hash");
  }

  return failures;
}

function main() {
  let totalFailures = 0;

  for (const locale of LOCALES) {
    const failures = validateLocale(locale);
    if (failures.length === 0) {
      console.log(`✓ ${locale}: all assertions passed`);
    } else {
      console.error(`✗ ${locale}:`);
      for (const failure of failures) {
        console.error(`  - ${failure}`);
      }
      totalFailures += failures.length;
    }
  }

  if (totalFailures > 0) {
    console.error(`\nvalidate:ps1 failed (${totalFailures} assertion(s))`);
    process.exit(1);
  }

  console.log("\nvalidate:ps1 passed for pt-BR and en");
}

main();
