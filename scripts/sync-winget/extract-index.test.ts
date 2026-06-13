import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import AdmZip from "adm-zip";

import { extractIndexDb } from "./extract-index.js";

test("extractIndexDb extrai Public/index.db do container zip", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-extract-"));
  const msixPath = join(dir, "source.msix");
  const expected = Buffer.from("SQLite format 3\u0000fake");

  const zip = new AdmZip();
  zip.addFile("Public/index.db", expected);
  zip.addFile("AppxManifest.xml", Buffer.from("<xml/>"));
  zip.writeZip(msixPath);

  const outPath = extractIndexDb(msixPath, dir);
  assert.deepEqual(readFileSync(outPath), expected);
});

test("extractIndexDb falha com mensagem clara se não houver index.db", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-extract-"));
  const msixPath = join(dir, "empty.msix");
  const zip = new AdmZip();
  zip.addFile("AppxManifest.xml", Buffer.from("<xml/>"));
  zip.writeZip(msixPath);

  assert.throws(() => extractIndexDb(msixPath, dir), /index\.db/);
});
