// Block type colors (left border)
export const BLOCK_TYPE_COLORS = {
  task: "#7c3aed",     // violet
  event: "#3b82f6",    // blue
  call: "#10b981",     // emerald
  reminder: "#f59e0b", // amber
  meeting: "#10b981",  // emerald
} as const;

// AI-executed block color override
export const AI_EXECUTED_COLOR = "#eab308"; // gold

// Block status colors
export const STATUS_COLORS = {
  pending: "#71717a",   // gray
  in_progress: "#3b82f6", // blue
  completed: "#10b981", // green
  late: "#ef4444",      // red
  missed: "#ef4444",    // red
} as const;

// XP awards
export const XP_AWARDS = {
  COMPLETE_ON_TIME: 100,
  COMPLETE_STAKED: 150,
  AI_EXECUTED: 50,
  LATE_COMPLETION_STAKED: 30,
  QUALITY_90_100: 75,
  QUALITY_75_89: 25,
  QUALITY_BELOW_50: -25,
  STREAK_3_DAY: 200,
  STREAK_7_DAY: 500,
  STREAK_30_DAY: 2000,
} as const;

// Streak multipliers
export const STREAK_MULTIPLIERS = {
  DAY_3: 1.5,
  DAY_7: 2.0,
  DAY_30: 3.0,
} as const;

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return STREAK_MULTIPLIERS.DAY_30;
  if (streakDays >= 7) return STREAK_MULTIPLIERS.DAY_7;
  if (streakDays >= 3) return STREAK_MULTIPLIERS.DAY_3;
  return 1.0;
}

// Level thresholds
export const LEVELS = [
  { level: 1, name: "Lurker", xpRequired: 0, shields: 0 },
  { level: 2, name: "Builder", xpRequired: 500, shields: 1 },
  { level: 3, name: "Operator", xpRequired: 2000, shields: 1 },
  { level: 4, name: "Architect", xpRequired: 7000, shields: 2 },
  { level: 5, name: "Sovereign", xpRequired: 20000, shields: 5 },
  { level: 6, name: "Legend", xpRequired: 50000, shields: 5 },
] as const;

export function getLevelForXP(xp: number): (typeof LEVELS)[number] {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getXPToNextLevel(xp: number): number {
  const currentLevel = getLevelForXP(xp);
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  if (!nextLevel) return 0;
  return nextLevel.xpRequired - xp;
}

// Priority ordering for conflict resolution
export const PRIORITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

// SOL price cache TTL (5 minutes)
export const SOL_PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

// Working hours
export const WORKING_HOURS = {
  start: 8,  // 8am
  end: 24,   // midnight
} as const;

// Buffer between blocks (minutes)
export const BLOCK_BUFFER_MINUTES = 15;

// Claude config
export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const CLAUDE_MAX_TOKENS = 2000;

// Staking
export const DEFAULT_STAKE_USD = 2;
export const DAILY_PENALTY_PCT = 0.10; // 10%
