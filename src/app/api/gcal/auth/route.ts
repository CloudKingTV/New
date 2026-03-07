import { NextRequest, NextResponse } from "next/server";
import { getGCalAuthUrl } from "@/lib/gcal";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=not_authenticated`);
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal/callback`;
  const authUrl = getGCalAuthUrl(redirectUri, userId);
  return NextResponse.redirect(authUrl);
}
