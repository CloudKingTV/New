import { NextResponse } from "next/server";
import { getGCalAuthUrl } from "@/lib/gcal";

export async function GET() {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gcal/callback`;
  const authUrl = await getGCalAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
