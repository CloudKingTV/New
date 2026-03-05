import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { awardCompletionXP } from "@/lib/xp";
import { updateStreak } from "@/lib/streaks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: blockId } = await params;
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch block
    const { data: block } = await supabase
      .from("blocks")
      .select("*")
      .eq("id", blockId)
      .eq("user_id", user.id)
      .single();

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    if (block.status === "completed") {
      return NextResponse.json({ error: "Already completed" }, { status: 400 });
    }

    // Mark complete
    await supabase
      .from("blocks")
      .update({ status: "completed" })
      .eq("id", blockId);

    // Award XP
    const { xpAwarded, newTotal, leveledUp } = await awardCompletionXP(
      supabase,
      user.id,
      block
    );

    // Update streak
    const { streak, bonusXP } = await updateStreak(supabase, user.id);

    // Create notification
    await supabase.from("jarvis_notifications").insert({
      user_id: user.id,
      message: `Completed: ${block.title} (+${xpAwarded} XP)${leveledUp ? " LEVEL UP!" : ""}`,
      type: "complete",
      related_block_id: blockId,
    });

    return NextResponse.json({
      xpAwarded,
      bonusXP,
      newTotal,
      leveledUp,
      streak,
    });
  } catch (error) {
    console.error("Complete block error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
