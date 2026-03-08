import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.json, icons
     * - api/auth routes (called before authentication)
     * Note: api/gcal routes ARE included so middleware refreshes the session
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api/auth).*)",
  ],
};
