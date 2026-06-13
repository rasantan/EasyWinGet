import { writeFileSync } from "node:fs";
import { join } from "node:path";

import AdmZip from "adm-zip";

const INDEX_ENTRY_NAMES = ["Public/index.db", "Public\\index.db"];

export function extractIndexDb(msixPath: string, outDir: string): string {
  const zip = new AdmZip(msixPath);
  const entries = zip.getEntries();

  const entry = entries.find((e) =>
    INDEX_ENTRY_NAMES.includes(e.entryName) ||
    e.entryName.toLowerCase().endsWith("public/index.db"),
  );

  if (!entry) {
    throw new Error(
      "Public/index.db não encontrado dentro do .msix (estrutura inesperada da fonte)",
    );
  }

  const outPath = join(outDir, "index.db");
  writeFileSync(outPath, entry.getData());
  return outPath;
}
