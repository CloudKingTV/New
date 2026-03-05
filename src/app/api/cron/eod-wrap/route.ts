import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateEODWrap } from "@/lib/briefings";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await supabase.from("users").select("id");

  for (const user of users || []) {
    try {
      await generateEODWrap(supabase, user.id);
    } catch (err) {
      console.error(`EOD wrap failed for user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true });
}
