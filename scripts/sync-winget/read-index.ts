import { DatabaseSync } from "node:sqlite";

import { pickLatestVersion } from "./version-compare.js";

export type IndexEntry = {
  package_id: string;
  version: string;
};

function tableExists(db: DatabaseSync, name: string): boolean {
  const row = db
    .prepare("select name from sqlite_master where type='table' and name = ?")
    .get(name);
  return Boolean(row);
}

function columnNames(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`pragma table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return new Set(rows.map((r) => r.name));
}

// source2 (v2) schema: a single denormalized `packages` table already exposes
// the package id and its latest version.
function readV2(db: DatabaseSync): IndexEntry[] {
  const rows = db
    .prepare("select id as package_id, latest_version as version from packages")
    .all() as Array<{ package_id: string; version: string }>;

  const entries: IndexEntry[] = [];
  for (const row of rows) {
    if (!row.package_id) continue;
    entries.push({ package_id: row.package_id, version: row.version ?? "" });
  }
  return entries;
}

// Legacy normalized schema: ids + versions joined through manifest.
function readLegacy(db: DatabaseSync): IndexEntry[] {
  const rows = db
    .prepare(
      `select i.id as package_id, v.version as version
       from manifest m
       join ids i on i.rowid = m.id
       join versions v on v.rowid = m.version`,
    )
    .all() as Array<{ package_id: string; version: string }>;

  const byId = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.package_id) continue;
    const list = byId.get(row.package_id) ?? [];
    list.push(row.version ?? "");
    byId.set(row.package_id, list);
  }

  const entries: IndexEntry[] = [];
  for (const [package_id, versions] of byId) {
    entries.push({ package_id, version: pickLatestVersion(versions) ?? "" });
  }
  return entries;
}

export function readIndex(dbPath: string): IndexEntry[] {
  const db = new DatabaseSync(dbPath, { readOnly: true });

  try {
    if (tableExists(db, "packages")) {
      const cols = columnNames(db, "packages");
      if (cols.has("id") && cols.has("latest_version")) {
        return readV2(db);
      }
    }

    if (
      tableExists(db, "manifest") &&
      tableExists(db, "ids") &&
      tableExists(db, "versions")
    ) {
      return readLegacy(db);
    }

    throw new Error(
      "index.db com schema desconhecido (sem tabela `packages` v2 nem `manifest`/`ids`/`versions` — verifique a versão da fonte)",
    );
  } finally {
    db.close();
  }
}
