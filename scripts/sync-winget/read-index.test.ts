import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { readIndex } from "./read-index.js";

function buildV2Fixture(dbPath: string): void {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    create table packages (
      rowid integer primary key,
      id text,
      name text,
      moniker text,
      latest_version text
    );
    insert into packages (rowid, id, name, latest_version) values
      (1, '7zip.7zip', '7-Zip', '24.09'),
      (2, 'Microsoft.VisualStudioCode', 'Visual Studio Code', '1.80.0');
  `);
  db.close();
}

function buildLegacyFixture(dbPath: string): void {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    create table ids (rowid integer primary key, id text);
    create table versions (rowid integer primary key, version text);
    create table manifest (rowid integer primary key, id integer, version integer);
    insert into ids (rowid, id) values (1, '7zip.7zip'), (2, 'Microsoft.VisualStudioCode');
    insert into versions (rowid, version) values (1, '23.01'), (2, '24.09'), (3, '1.80.0');
    insert into manifest (rowid, id, version) values (1, 1, 1), (2, 1, 2), (3, 2, 3);
  `);
  db.close();
}

test("readIndex lê latest_version do schema v2 (packages)", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-index-"));
  const dbPath = join(dir, "index.db");
  buildV2Fixture(dbPath);

  const entries = readIndex(dbPath).sort((a, b) =>
    a.package_id.localeCompare(b.package_id),
  );

  assert.deepEqual(entries, [
    { package_id: "7zip.7zip", version: "24.09" },
    { package_id: "Microsoft.VisualStudioCode", version: "1.80.0" },
  ]);
});

test("readIndex devolve a maior versão por package_id (schema legado)", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-index-"));
  const dbPath = join(dir, "legacy.db");
  buildLegacyFixture(dbPath);

  const entries = readIndex(dbPath).sort((a, b) =>
    a.package_id.localeCompare(b.package_id),
  );

  assert.deepEqual(entries, [
    { package_id: "7zip.7zip", version: "24.09" },
    { package_id: "Microsoft.VisualStudioCode", version: "1.80.0" },
  ]);
});

test("readIndex lança erro claro com schema desconhecido", () => {
  const dir = mkdtempSync(join(tmpdir(), "winstack-index-"));
  const dbPath = join(dir, "broken.db");
  const db = new DatabaseSync(dbPath);
  db.exec("create table foo (x integer);");
  db.close();

  assert.throws(() => readIndex(dbPath), /schema desconhecido/);
});
