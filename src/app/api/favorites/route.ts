import { NextResponse } from "next/server";

import { ensureAuthenticatedUser } from "@/lib/supabase/ensure-user";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { user, error: authError } = await ensureAuthenticatedUser(supabase);

  if (authError) {
    return authError;
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("*, packages(*)")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, error: authError } = await ensureAuthenticatedUser(supabase);

  if (authError) {
    return authError;
  }

  const body = await request.json();
  const package_id = body?.package_id;

  if (!package_id || typeof package_id !== "string") {
    return NextResponse.json(
      { error: "package_id is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("favorites")
    .upsert({ user_id: user.id, package_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { user, error: authError } = await ensureAuthenticatedUser(supabase);

  if (authError) {
    return authError;
  }

  const package_id = new URL(request.url).searchParams.get("package_id");

  if (!package_id) {
    return NextResponse.json(
      { error: "package_id query param is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("package_id", package_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
