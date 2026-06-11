import { readFileSync } from "node:fs";

import type { ParsedPackage } from "./parse-manifest.js";

const BATCH_SIZE = 100;

function sqlString(value: string | null | undefined): string {
  if (value == null) return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlArray(values: string[]): string {
  if (values.length === 0) return "array[]::text[]";
  return `array[${values.map((value) => sqlString(value)).join(", ")}]::text[]`;
}

export function packagesToUpsertSql(packages: ParsedPackage[]): string {
  if (packages.length === 0) return "";

  const values = packages
    .map((pkg) => {
      return `(
        ${sqlString(pkg.package_id)},
        ${sqlString(pkg.name)},
        ${sqlString(pkg.publisher)},
        ${sqlString(pkg.description)},
        ${sqlString(pkg.description_full)},
        ${sqlString(pkg.version)},
        ${sqlString(pkg.installer_type)},
        ${sqlArray(pkg.categories)},
        ${sqlString(pkg.moniker)},
        ${sqlString(pkg.last_synced_at)}::timestamptz
      )`;
    })
    .join(",\n");

  return `
insert into public.packages (
  package_id,
  name,
  publisher,
  description,
  description_full,
  version,
  installer_type,
  categories,
  moniker,
  last_synced_at
)
values
${values}
on conflict (package_id) do update set
  name = excluded.name,
  publisher = excluded.publisher,
  description = excluded.description,
  description_full = excluded.description_full,
  version = excluded.version,
  installer_type = excluded.installer_type,
  categories = excluded.categories,
  moniker = excluded.moniker,
  last_synced_at = excluded.last_synced_at;
`.trim();
}

function main(): void {
  const inputPath = process.argv[2];
  const batchIndex = Number.parseInt(process.argv[3] ?? "0", 10);
  const batchSize = Number.parseInt(process.argv[4] ?? String(BATCH_SIZE), 10);

  if (!inputPath) {
    throw new Error(
      "Usage: node packages-to-sql.mjs <packages.json> [batchIndex] [batchSize]",
    );
  }

  const packages = JSON.parse(readFileSync(inputPath, "utf8")) as ParsedPackage[];
  const offset = batchIndex * batchSize;
  const batch = packages.slice(offset, offset + batchSize);

  if (batch.length === 0) {
    console.log("-- empty batch");
    return;
  }

  console.log(packagesToUpsertSql(batch));
}

main();
