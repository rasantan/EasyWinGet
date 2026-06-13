import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { unzipSync } from "fflate";

const INDEX_ENTRY_NAMES = ["Public/index.db", "Public\\index.db"];

function isIndexEntry(name: string): boolean {
  return (
    INDEX_ENTRY_NAMES.includes(name) ||
    name.toLowerCase().replace(/\\/g, "/").endsWith("public/index.db")
  );
}

export function extractIndexDb(msixPath: string, outDir: string): string {
  const buffer = readFileSync(msixPath);
  const bytes = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );

  // fflate reads the central directory, so it handles MSIX/zip entries that
  // use streaming data descriptors (which adm-zip rejects as malformed).
  const files = unzipSync(bytes, { filter: (file) => isIndexEntry(file.name) });

  const entryName = Object.keys(files).find(isIndexEntry);
  if (!entryName || !files[entryName]?.length) {
    throw new Error(
      "Public/index.db não encontrado dentro do .msix (estrutura inesperada da fonte)",
    );
  }

  const outPath = join(outDir, "index.db");
  writeFileSync(outPath, files[entryName]);
  return outPath;
}
