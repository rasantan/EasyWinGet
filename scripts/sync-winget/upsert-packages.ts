import { createClient } from "@supabase/supabase-js";

import type { ParsedPackage } from "./parse-manifest.js";

const BATCH_SIZE = 500;

export type UpsertStats = {
  upserted: number;
  errors: number;
};

export function sanitizePackage(
  pkg: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pkg)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    clean[key] = value;
  }
  return clean;
}

export async function upsertPackages(
  packages: ParsedPackage[],
): Promise<UpsertStats> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required",
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let upserted = 0;
  let errors = 0;

  for (let offset = 0; offset < packages.length; offset += BATCH_SIZE) {
    const batch = packages
      .slice(offset, offset + BATCH_SIZE)
      .map((pkg) => sanitizePackage(pkg as unknown as Record<string, unknown>));
    const batchNumber = Math.floor(offset / BATCH_SIZE) + 1;

    const { error } = await supabase
      .from("packages")
      .upsert(batch, { onConflict: "package_id" });

    if (error) {
      console.error(`Batch ${batchNumber} failed: ${error.message}`);
      errors += batch.length;
      continue;
    }

    upserted += batch.length;
    console.log(`Batch ${batchNumber}: upserted ${batch.length} packages`);
  }

  return { upserted, errors };
}
