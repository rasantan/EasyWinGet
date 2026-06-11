import { NextResponse } from "next/server";

import { generateBundleSlug } from "@/lib/bundles/slug";
import { createClient } from "@/lib/supabase/server";

const BUNDLE_SELECT = `
  *,
  bundle_items (
    sort_order,
    package_id,
    packages (*)
  )
`;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;
  const package_ids: string[] = Array.isArray(body?.package_ids)
    ? body.package_ids
    : [];
  const is_public = Boolean(body?.is_public);
  const locale = body?.locale === "en" ? "en" : "pt-BR";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (package_ids.length === 0) {
    return NextResponse.json(
      { error: "package_ids must not be empty" },
      { status: 400 },
    );
  }

  const slug = generateBundleSlug(name);

  const { data: bundle, error: bundleError } = await supabase
    .from("bundles")
    .insert({
      user_id: user.id,
      name,
      description,
      slug,
      is_public,
      locale,
    })
    .select()
    .single();

  if (bundleError || !bundle) {
    return NextResponse.json(
      { error: bundleError?.message ?? "Failed to create bundle" },
      { status: 400 },
    );
  }

  const items = package_ids.map((package_id, index) => ({
    bundle_id: bundle.id,
    package_id,
    sort_order: index,
  }));

  const { error: itemsError } = await supabase
    .from("bundle_items")
    .insert(items);

  if (itemsError) {
    await supabase.from("bundles").delete().eq("id", bundle.id);
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  const { data: fullBundle, error: fetchError } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("id", bundle.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  return NextResponse.json(fullBundle, { status: 201 });
}
