import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const BUNDLE_SELECT = `
  *,
  bundle_items (
    sort_order,
    package_id,
    packages (*)
  )
`;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!data.is_public && data.user_id !== user?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
