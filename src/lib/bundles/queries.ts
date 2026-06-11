import { createClient } from "@/lib/supabase/server";

import type { Bundle, DownloadHistoryEntry } from "./types";

const BUNDLE_SELECT = `
  *,
  bundle_items (
    sort_order,
    package_id,
    packages (*)
  )
`;

export async function getUserBundles(userId: string): Promise<Bundle[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`getUserBundles failed: ${error.message}`);
  }

  return (data ?? []) as Bundle[];
}

export async function getBundleBySlug(slug: string): Promise<Bundle | null> {
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
    throw new Error(`getBundleBySlug failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const bundle = data as Bundle;

  if (!bundle.is_public && bundle.user_id !== user?.id) {
    return null;
  }

  return bundle;
}

export async function getDownloadHistory(
  userId: string,
  limit = 20,
): Promise<DownloadHistoryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("download_history")
    .select("*, bundles(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`getDownloadHistory failed: ${error.message}`);
  }

  return (data ?? []) as DownloadHistoryEntry[];
}
