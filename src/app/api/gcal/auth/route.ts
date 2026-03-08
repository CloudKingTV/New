import { NextRequest, NextResponse } from "next/server";
import { getGCalAuthUrl } from "@/lib/gcal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Debug: log all cookies to see if auth cookies are present
  const allCookies = request.cookies.getAll();
  console.log("[gcal/auth] Cookies present:", allCookies.map(c => `${c.name}=${c.value.slice(0, 20)}...`));

  const supabase = await createServerSupabaseClient();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  console.log("[gcal/auth] getSession result:", {
    hasSession: !!sessionData?.session,
    sessionError: sessionError?.message,
    userId: sessionData?.session?.user?.id
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log("[gcal/auth] getUser result:", {
    hasUser: !!user,
    userId: user?.id,
    userError: userError?.message
  });

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=not_authenticated`);
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal/callback`;
  const authUrl = getGCalAuthUrl(redirectUri, user.id);
  return NextResponse.redirect(authUrl);
}
