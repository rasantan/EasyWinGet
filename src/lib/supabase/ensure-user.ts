import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const AUTH_ERROR_MESSAGE =
  "Auth session could not be created — check Anonymous Sign-Ins in Supabase";

export type EnsureUserResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse };

export async function ensureAuthenticatedUser(
  supabase: SupabaseClient,
): Promise<EnsureUserResult> {
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  if (existingUser) {
    return { user: existingUser, error: null };
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    return {
      user: null,
      error: NextResponse.json({ error: AUTH_ERROR_MESSAGE }, { status: 401 }),
    };
  }

  return { user: data.user, error: null };
}
