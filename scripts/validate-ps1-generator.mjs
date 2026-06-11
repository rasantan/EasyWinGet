/**
 * Automated validation for EasyWinGet PS1 script generator (Task 5.7).
 * Imports generateScript from src via tsx loader (see npm script validate:ps1).
 *
 * Run: npm run validate:ps1
 */

import { generateScript } from "../src/lib/script-generator/generate.ts";

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
      script.includes("'install'") && script.includes("& winget @wingetArgs"),
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

const LOCALE_STRINGS = {
  "pt-BR": "EasyWinGet — Instalador",
  en: "EasyWinGet — Installer",
};

function validateLocale(locale) {
  const { script, hash } = generateScript({
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
