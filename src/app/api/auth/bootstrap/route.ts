import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type BootstrapBody = {
  captchaToken?: unknown;
};

export async function POST(request: Request) {
  let body: BootstrapBody = {};

  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    // Empty body is valid when CAPTCHA is disabled.
  }

  const captchaToken =
    typeof body.captchaToken === "string" && body.captchaToken.length > 0
      ? body.captchaToken
      : undefined;

  const supabase = await createClient();

  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  if (existingUser) {
    return NextResponse.json({ ok: true, userId: existingUser.id });
  }

  const { data, error } = await supabase.auth.signInAnonymously(
    captchaToken ? { options: { captchaToken } } : undefined,
  );

  if (error || !data.user) {
    const message =
      error?.message?.includes("captcha") ||
      error?.message?.includes("Captcha")
        ? "CAPTCHA is enabled in Supabase but no token was provided. Disable CAPTCHA under Authentication → Bot and Abuse Protection, or configure NEXT_PUBLIC_TURNSTILE_SITE_KEY."
        : (error?.message ??
          "Auth session could not be created — check Anonymous Sign-Ins in Supabase");

    return NextResponse.json({ error: message }, { status: 401 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
