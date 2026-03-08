import { NextRequest, NextResponse } from "next/server";
import { getGCalAuthUrl } from "@/lib/gcal";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log("[gcal/auth] cookies:", allCookies.map(c => c.name));

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  console.log("[gcal/auth] getUser result:", { user: user?.id, error: error?.message });

  if (!user) {
    // Fallback: check userId query param
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=not_authenticated`);
    }
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal/callback`;
    const authUrl = getGCalAuthUrl(redirectUri, userId);
    return NextResponse.redirect(authUrl);
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal/callback`;
  const authUrl = getGCalAuthUrl(redirectUri, user.id);
  return NextResponse.redirect(authUrl);
}
