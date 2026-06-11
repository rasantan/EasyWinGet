import { NextResponse } from "next/server";

import { generateScript } from "@/lib/script-generator/generate";
import { isScriptLocale } from "@/lib/script-generator/strings";
import { ensureAuthenticatedUser } from "@/lib/supabase/ensure-user";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GenerateRequestBody = {
  package_ids?: unknown;
  locale?: unknown;
  bundle_name?: unknown;
};

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;

  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const packageIds = body.package_ids;
  const locale = body.locale;
  const bundleName =
    typeof body.bundle_name === "string" && body.bundle_name.trim().length > 0
      ? body.bundle_name.trim()
      : undefined;

  if (!Array.isArray(packageIds) || packageIds.length === 0) {
    return NextResponse.json(
      { error: "package_ids must be a non-empty array" },
      { status: 400 },
    );
  }

  if (
    !packageIds.every(
      (id): id is string => typeof id === "string" && isUuid(id),
    )
  ) {
    return NextResponse.json(
      { error: "Each package_id must be a valid UUID" },
      { status: 400 },
    );
  }

  if (typeof locale !== "string" || !isScriptLocale(locale)) {
    return NextResponse.json(
      { error: "locale must be pt-BR or en" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { user, error: authError } = await ensureAuthenticatedUser(supabase);

  if (authError) {
    return authError;
  }

  const uniquePackageIds = [...new Set(packageIds)];

  const { data: packages, error: packagesError } = await supabase
    .from("packages")
    .select("id, package_id, name, version")
    .in("id", uniquePackageIds);

  if (packagesError) {
    return NextResponse.json(
      { error: "Failed to load packages" },
      { status: 500 },
    );
  }

  if (!packages?.length || packages.length !== uniquePackageIds.length) {
    return NextResponse.json(
      { error: "One or more packages were not found" },
      { status: 400 },
    );
  }

  const orderedPackages = uniquePackageIds
    .map((id) => packages.find((pkg) => pkg.id === id))
    .filter((pkg): pkg is NonNullable<typeof pkg> => Boolean(pkg));

  const { script, hash } = generateScript({
    packages: orderedPackages.map((pkg) => ({
      package_id: pkg.package_id,
      name: pkg.name,
      version: pkg.version,
    })),
    locale,
    bundle_name: bundleName,
  });

  const { error: historyError } = await supabase.from("download_history").insert({
    user_id: user.id,
    package_ids: uniquePackageIds,
    script_hash: hash,
  });

  if (historyError) {
    return NextResponse.json(
      { error: "Failed to record download history" },
      { status: 500 },
    );
  }

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="easywinget-install.ps1"',
      "X-Script-Hash": hash,
    },
  });
}
