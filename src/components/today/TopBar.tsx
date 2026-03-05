"use client";

import { useAuth } from "@/providers/AuthProvider";
import { getLevelForXP, getXPToNextLevel, LEVELS } from "@/lib/constants";

export function TopBar() {
  const { appUser } = useAuth();

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const xp = appUser?.xp_total ?? 0;
  const level = getLevelForXP(xp);
  const xpToNext = getXPToNextLevel(xp);
  const nextLevel = LEVELS.find((l) => l.level === level.level + 1);
  const progressPct = nextLevel
    ? ((xp - level.xpRequired) / (nextLevel.xpRequired - level.xpRequired)) * 100
    : 100;

  const streak = appUser?.current_streak ?? 0;
  const multiplier =
    streak >= 30 ? "3x" : streak >= 7 ? "2x" : streak >= 3 ? "1.5x" : null;

  return (
    <div className="space-y-3 px-4 pt-4">
      {/* Date + Streak */}
      <div className="flex items-center justify-between">
        <h1
          className="text-lg font-bold text-foreground"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {dateStr}
        </h1>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-amber/10 px-3 py-1 text-xs font-semibold text-amber">
              <span>🔥</span>
              <span>{streak}d</span>
              {multiplier && (
                <span className="ml-1 rounded bg-amber/20 px-1.5 py-0.5 text-[10px]">
                  {multiplier}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* XP Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span
            className="font-semibold text-violet-light"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Lv.{level.level} {level.name}
          </span>
          <span className="text-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {xp.toLocaleString()} XP
            {xpToNext > 0 && ` / ${(xp + xpToNext).toLocaleString()}`}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet to-violet-light transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
