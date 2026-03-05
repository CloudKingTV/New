import type { SupabaseClient } from "@supabase/supabase-js";
import type { Block, User } from "@/lib/types";

export async function getUserContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ user: User; blocks: Block[]; solAtRisk: number }> {
  // Fetch user profile
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  // Fetch blocks for today + next 7 days
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endDate = new Date(startOfToday);
  endDate.setDate(endDate.getDate() + 8);

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", startOfToday.toISOString())
    .lt("start_time", endDate.toISOString())
    .order("start_time", { ascending: true });

  const blockList = (blocks || []) as Block[];

  // Calculate SOL at risk
  const solAtRisk = blockList
    .filter((b) => b.sol_stake_status === "staked" && b.status !== "completed")
    .reduce((sum, b) => sum + Number(b.sol_stake_amount), 0);

  return { user: user as User, blocks: blockList, solAtRisk };
}
