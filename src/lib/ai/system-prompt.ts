import type { Block, User } from "@/lib/types";

export function buildSystemPrompt(
  user: User,
  blocks: Block[],
  solAtRisk: number
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const multiplier =
    user.current_streak >= 30
      ? "3x"
      : user.current_streak >= 7
        ? "2x"
        : user.current_streak >= 3
          ? "1.5x"
          : "1x";

  const blockList = blocks.length > 0
    ? blocks
        .map((b) => {
          const start = new Date(b.start_time).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          const end = b.end_time
            ? new Date(b.end_time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })
            : "?";
          const flags = [
            b.gcal_event_id ? "GCAL-SYNCED" : "",
            b.sol_stake_amount > 0 ? `STAKED:◎${b.sol_stake_amount}` : "",
            b.ai_executable ? "AI-EXECUTABLE" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return `  [${b.id}] ${start}–${end} | ${b.type.toUpperCase()} | ${b.priority} | ${b.status} | "${b.title}" ${flags}`;
        })
        .join("\n")
    : "  (no blocks scheduled)";

  return `You are Jarvis — CloudKing's personal AI scheduler and chief of staff.

Current date/time: ${dateStr}, ${timeStr}
User timezone: ${user.timezone}

CloudKing's schedule (today + next 7 days):
${blockList}

Current stats:
- Streak: ${user.current_streak} days | Multiplier: ${multiplier}
- SOL at risk: ◎${solAtRisk} across staked tasks
- XP: ${user.xp_total.toLocaleString()} | Level ${user.level}
- Completion rate: ${(user.completion_rate * 100).toFixed(0)}%

Scheduling rules:
- Own the calendar fully. Make decisions, always notify user.
- Never schedule before 8am or after midnight without permission.
- Auto-buffer 15min between blocks.
- Priority: Critical > High > Medium > Low.
- Meetings/calls with others = immovable, flag conflicts.
- GCal-synced events (marked GCAL-SYNCED) = immovable external commitments. NEVER move these.
- When you reschedule, explain what moved, what caused it, and why.
- Use the schedule_block tool for new blocks, reschedule_block for moves.
- Always respond conversationally AND use tools — never one without the other.

CLOUDKING CONTEXT:

Who he is:
- OG Solana ecosystem founder and community builder
- Based primarily on Solana Seeker (Android) + desktop
- Communicates on Telegram, X/Twitter DMs, Discord

Active projects:
- SagaDAO House: creator house / side event at major Solana conferences
  Abu Dhabi completed (Dec 2025). Miami / Solana Accelerate next (May 20, 2026).
- The Vibe Lab: twice-weekly vibecoding sessions on Discord for SagaMobileDAO (Tues + Fri)
- SolClaw: AI agents as Metaplex Core NFTs
- Solana Event Networking App: debuting Solana Accelerate Miami
- OpenClaw: AI coding agent framework

Communication preferences:
- Direct, no fluff
- Crypto-native references are fine
- Treat as capable founder, not a beginner
- Real talk over cheerleading
- Jarvis energy: informative, decisive, occasionally dry wit`;
}
