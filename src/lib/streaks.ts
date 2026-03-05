import type { SupabaseClient } from "@supabase/supabase-js";
import { XP_AWARDS } from "./constants";

export async function updateStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<{ streak: number; bonusXP: number }> {
  const { data: user } = await supabase
    .from("users")
    .select("current_streak, longest_streak, xp_total")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  // Check if this is the first completion today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { count } = await supabase
    .from("blocks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("updated_at", today.toISOString())
    .lt("updated_at", tomorrow.toISOString());

  // If more than one completion today, streak was already incremented
  if ((count || 0) > 1) {
    return { streak: user.current_streak, bonusXP: 0 };
  }

  // First completion today — increment streak
  const newStreak = user.current_streak + 1;
  const longestStreak = Math.max(newStreak, user.longest_streak);

  const update: Record<string, unknown> = {
    current_streak: newStreak,
    longest_streak: longestStreak,
  };

  // Check for streak bonuses
  let bonusXP = 0;
  if (newStreak === 3) bonusXP = XP_AWARDS.STREAK_3_DAY;
  else if (newStreak === 7) bonusXP = XP_AWARDS.STREAK_7_DAY;
  else if (newStreak === 30) bonusXP = XP_AWARDS.STREAK_30_DAY;

  if (bonusXP > 0) {
    update.xp_total = user.xp_total + bonusXP;

    await supabase.from("xp_events").insert({
      user_id: userId,
      event_type: `streak_${newStreak}`,
      xp_amount: bonusXP,
      multiplier: 1.0,
    });
  }

  await supabase.from("users").update(update).eq("id", userId);

  return { streak: newStreak, bonusXP };
}

export async function resetStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("users")
    .update({ current_streak: 0 })
    .eq("id", userId);
}
