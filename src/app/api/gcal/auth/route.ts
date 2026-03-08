import { NextRequest, NextResponse } from "next/server";
import { getGCalAuthUrl } from "@/lib/gcal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=not_authenticated`);
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal/callback`;
  const authUrl = getGCalAuthUrl(redirectUri, user.id);
  return NextResponse.redirect(authUrl);
}
