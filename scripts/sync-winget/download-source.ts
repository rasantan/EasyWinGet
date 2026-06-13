import { writeFile } from "node:fs/promises";

export const SOURCE_URLS = [
  "https://cdn.winget.microsoft.com/cache/source2.msix",
  "https://cdn.winget.microsoft.com/cache/source.msix",
];

const MIN_BYTES = 100_000; // sanity: o .msix tem dezenas de MB

export async function downloadSourceMsix(destPath: string): Promise<string> {
  let lastError = "";

  for (const url of SOURCE_URLS) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "WinStack-sync/1.0" },
      });

      if (!response.ok) {
        lastError = `${url} -> HTTP ${response.status}`;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < MIN_BYTES) {
        lastError = `${url} -> arquivo muito pequeno (${buffer.byteLength} bytes)`;
        continue;
      }

      await writeFile(destPath, buffer);
      console.log(`Downloaded ${url} (${buffer.byteLength} bytes) -> ${destPath}`);
      return url;
    } catch (error) {
      lastError = `${url} -> ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  throw new Error(`Falha ao baixar a fonte pré-indexada. Última falha: ${lastError}`);
}
