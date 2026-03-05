import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncGCalEvents } from "@/lib/gcal";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get users with GCal connected
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .not("gcal_refresh_token", "is", null);

  let totalSynced = 0;
  for (const user of users || []) {
    try {
      const synced = await syncGCalEvents(supabase, user.id);
      totalSynced += synced;
    } catch (err) {
      console.error(`GCal sync failed for user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, synced: totalSynced });
}
