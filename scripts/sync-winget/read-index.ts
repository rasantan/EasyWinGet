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

export function readIndex(dbPath: string): IndexEntry[] {
  const db = new DatabaseSync(dbPath, { readOnly: true });

  try {
    for (const required of ["manifest", "ids", "versions"]) {
      if (!tableExists(db, required)) {
        throw new Error(
          `index.db sem a tabela esperada "${required}" (schema desconhecido — verifique a versão da fonte)`,
        );
      }
    }

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
  } finally {
    db.close();
  }
}
