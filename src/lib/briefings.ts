import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Block, User } from "./types";
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from "./constants";

export async function generateMorningBriefing(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { user, todayBlocks, solAtRisk } = await getBriefingContext(supabase, userId);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const multiplier =
    user.current_streak >= 30 ? "3x" : user.current_streak >= 7 ? "2x" : user.current_streak >= 3 ? "1.5x" : "1x";

  const blockList = todayBlocks.length > 0
    ? todayBlocks.map((b) => {
        const start = new Date(b.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const end = b.end_time ? new Date(b.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "?";
        return `  ${start}–${end} | ${b.type} | ${b.priority} | "${b.title}"${b.sol_stake_amount > 0 ? ` (◎${b.sol_stake_amount} staked)` : ""}${b.gcal_event_id ? " [GCal]" : ""}`;
      }).join("\n")
    : "  (empty day)";

  const prompt = `Generate CloudKing's morning briefing for ${today}.

Today's blocks:
${blockList}

Current stats:
- Streak: ${user.current_streak} days | Multiplier: ${multiplier}
- SOL at risk today: ◎${solAtRisk} across staked tasks
- XP: ${user.xp_total} | Level ${user.level}

Output format:
1. One punchy opening line about the day (real talk, not cheerleading)
2. Priority stack: top 3 things that MUST happen today and why
3. Full schedule in time order
4. SOL at risk callout if staked tasks today
5. Streak status — push if going, warn if close to breaking
6. One tactical suggestion

Tone: Jarvis meets a ruthless COO. Direct. Smart. No fluff. CloudKing responds to honesty, not hype.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  // Store briefing
  await supabase.from("daily_briefings").insert({
    user_id: userId,
    type: "morning",
    content,
    day_date: new Date().toISOString().split("T")[0],
    sol_at_risk: solAtRisk,
    tasks_completed: 0,
    tasks_missed: 0,
    xp_earned: 0,
    streak_status: `${user.current_streak} days (${multiplier})`,
  });

  return content;
}

export async function generateEODWrap(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { user, todayBlocks, solAtRisk } = await getBriefingContext(supabase, userId);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const completed = todayBlocks.filter((b) => b.status === "completed");
  const missed = todayBlocks.filter((b) => b.status === "missed");
  const late = todayBlocks.filter((b) => b.status === "late");

  // Get today's XP
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: xpEvents } = await supabase
    .from("xp_events")
    .select("xp_amount")
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString());
  const xpEarned = (xpEvents || []).reduce((sum, e) => sum + e.xp_amount, 0);

  const multiplier =
    user.current_streak >= 30 ? "3x" : user.current_streak >= 7 ? "2x" : user.current_streak >= 3 ? "1.5x" : "1x";

  const prompt = `Generate CloudKing's end-of-day wrap for ${today}.

Completed: ${completed.map((b) => `"${b.title}"`).join(", ") || "none"}
Missed: ${missed.map((b) => `"${b.title}"`).join(", ") || "none"}
Late completions: ${late.map((b) => `"${b.title}"`).join(", ") || "none"}
XP earned today: ${xpEarned}
Streak: ${user.current_streak} days

Output format:
1. Verdict on the day — one honest line (good, bad, or ugly — say it straight)
2. Wins: what got done, quality scores if notable
3. Misses: what didn't happen and the real cost (SOL, XP, streak)
4. Tomorrow: top 3 priorities
5. Closing push — one line for tomorrow

Tone: Brutally honest. No participation trophies. If it was a bad day, name it. If it was good, acknowledge it without going soft.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  await supabase.from("daily_briefings").insert({
    user_id: userId,
    type: "eod",
    content,
    day_date: new Date().toISOString().split("T")[0],
    sol_at_risk: solAtRisk,
    tasks_completed: completed.length,
    tasks_missed: missed.length,
    xp_earned: xpEarned,
    streak_status: `${user.current_streak} days (${multiplier})`,
  });

  return content;
}

async function getBriefingContext(supabase: SupabaseClient, userId: string) {
  const { data: user } = await supabase.from("users").select("*").eq("id", userId).single();
  if (!user) throw new Error("User not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todayBlocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", today.toISOString())
    .lt("start_time", tomorrow.toISOString())
    .order("start_time");

  const blocks = (todayBlocks || []) as Block[];
  const solAtRisk = blocks
    .filter((b) => b.sol_stake_status === "staked" && b.status !== "completed")
    .reduce((sum, b) => sum + Number(b.sol_stake_amount), 0);

  return { user: user as User, todayBlocks: blocks, solAtRisk };
}
