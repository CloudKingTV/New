import type { SupabaseClient } from "@supabase/supabase-js";
import type { Block, User } from "./types";
import { XP_AWARDS, getStreakMultiplier, getLevelForXP, LEVELS } from "./constants";

export async function awardCompletionXP(
  supabase: SupabaseClient,
  userId: string,
  block: Block
): Promise<{ xpAwarded: number; newTotal: number; leveledUp: boolean }> {
  // Fetch current user
  const { data: user } = await supabase
    .from("users")
    .select("xp_total, level, current_streak")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  const streak = user.current_streak || 0;
  const multiplier = getStreakMultiplier(streak);

  // Calculate base XP
  let baseXP: number = XP_AWARDS.COMPLETE_ON_TIME;

  // Check if task is late
  const isLate = block.status === "late";
  const isStaked = block.sol_stake_status === "staked";

  if (isStaked && isLate) {
    baseXP = XP_AWARDS.LATE_COMPLETION_STAKED; // No multiplier
  } else if (isStaked) {
    baseXP = XP_AWARDS.COMPLETE_STAKED;
  } else if (block.ai_executed_at) {
    baseXP = XP_AWARDS.AI_EXECUTED;
  }

  // Apply multiplier (except for late staked tasks)
  const xpAwarded =
    isStaked && isLate ? baseXP : Math.round(baseXP * multiplier);

  // Update user XP
  const newTotal = user.xp_total + xpAwarded;
  const oldLevel = getLevelForXP(user.xp_total);
  const newLevel = getLevelForXP(newTotal);
  const leveledUp = newLevel.level > oldLevel.level;

  // Build update object
  const userUpdate: Record<string, unknown> = {
    xp_total: newTotal,
    level: newLevel.level,
  };

  // On level-up, store unlock entitlements
  if (leveledUp) {
    const unlockedThemes: string[] = [];
    if (newLevel.level >= 2) unlockedThemes.push("neon");
    if (newLevel.level >= 3) unlockedThemes.push("cyberpunk");
    if (newLevel.level >= 4) unlockedThemes.push("gold");
    if (newLevel.level >= 5) unlockedThemes.push("all");

    userUpdate.unlocked_themes = ["default", ...unlockedThemes];
    userUpdate.streak_shields = newLevel.shields;
  }

  await supabase.from("users").update(userUpdate).eq("id", userId);

  // Log XP event
  await supabase.from("xp_events").insert({
    user_id: userId,
    block_id: block.id,
    event_type: isStaked ? "complete_staked" : "complete",
    xp_amount: xpAwarded,
    multiplier,
  });

  // Update block xp_awarded
  await supabase
    .from("blocks")
    .update({ xp_awarded: xpAwarded })
    .eq("id", block.id);

  return { xpAwarded, newTotal, leveledUp };
}

export async function awardQualityXP(
  supabase: SupabaseClient,
  userId: string,
  blockId: string,
  qualityScore: number
): Promise<number> {
  let bonusXP = 0;
  if (qualityScore >= 90) bonusXP = XP_AWARDS.QUALITY_90_100;
  else if (qualityScore >= 75) bonusXP = XP_AWARDS.QUALITY_75_89;
  else if (qualityScore < 50) bonusXP = XP_AWARDS.QUALITY_BELOW_50;

  if (bonusXP !== 0) {
    const { data: user } = await supabase
      .from("users")
      .select("xp_total")
      .eq("id", userId)
      .single();

    if (user) {
      await supabase
        .from("users")
        .update({ xp_total: Math.max(0, user.xp_total + bonusXP) })
        .eq("id", userId);

      await supabase.from("xp_events").insert({
        user_id: userId,
        block_id: blockId,
        event_type: `quality_${qualityScore}`,
        xp_amount: bonusXP,
        multiplier: 1.0,
      });
    }
  }

  return bonusXP;
}
