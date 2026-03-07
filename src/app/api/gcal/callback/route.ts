import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exchangeGCalCode, syncGCalEvents } from "@/lib/gcal";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=no_code`);
  }

  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`);
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal/callback`;
    const tokens = await exchangeGCalCode(code, redirectUri);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Store tokens
    await supabase
      .from("users")
      .update({
        gcal_access_token: tokens.access_token,
        gcal_refresh_token: tokens.refresh_token,
        gcal_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        gcal_calendar_id: "primary",
      })
      .eq("id", user.id);

    // Initial sync
    await syncGCalEvents(supabase, user.id);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?gcal=connected`);
  } catch (error) {
    console.error("GCal callback error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=gcal_failed`);
  }
}
