import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { zipSync } from "fflate";

import { extractIndexDb } from "./extract-index.js";

function writeMsix(path: string, files: Record<string, Uint8Array>): void {
  writeFileSync(path, zipSync(files));
}

test("extractIndexDb extrai Public/index.db do container zip", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-extract-"));
  const msixPath = join(dir, "source.msix");
  const expected = Buffer.from("SQLite format 3\u0000fake");

  writeMsix(msixPath, {
    "Public/index.db": new Uint8Array(expected),
    "AppxManifest.xml": new Uint8Array(Buffer.from("<xml/>")),
  });

  const outPath = extractIndexDb(msixPath, dir);
  assert.deepEqual(readFileSync(outPath), expected);
});

test("extractIndexDb falha com mensagem clara se não houver index.db", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-extract-"));
  const msixPath = join(dir, "empty.msix");
  writeMsix(msixPath, {
    "AppxManifest.xml": new Uint8Array(Buffer.from("<xml/>")),
  });

  assert.throws(() => extractIndexDb(msixPath, dir), /index\.db/);
});
