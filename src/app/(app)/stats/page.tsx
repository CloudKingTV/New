"use client";

import { useAuth } from "@/providers/AuthProvider";
import { getLevelForXP, getXPToNextLevel, LEVELS } from "@/lib/constants";

export default function StatsPage() {
  const { appUser } = useAuth();
  const xp = appUser?.xp_total ?? 0;
  const level = getLevelForXP(xp);
  const xpToNext = getXPToNextLevel(xp);
  const nextLevel = LEVELS.find((l) => l.level === level.level + 1);
  const progressPct = nextLevel
    ? ((xp - level.xpRequired) / (nextLevel.xpRequired - level.xpRequired)) * 100
    : 100;

  return (
    <div className="relative z-10 px-4 py-6 space-y-6">
      <h1
        className="text-xl font-bold text-foreground"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        Stats & Reputation
      </h1>

      {/* Level ring */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface/50 p-6">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e1e3a" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#a855f7"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progressPct * 2.83} ${283 - progressPct * 2.83}`}
            />
          </svg>
          <span className="text-2xl font-bold text-violet-light font-mono">{level.level}</span>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{level.name}</p>
          <p className="text-xs text-muted font-mono">{xp.toLocaleString()} XP</p>
          {xpToNext > 0 && (
            <p className="text-[10px] text-muted">{xpToNext.toLocaleString()} XP to next level</p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Streak" value={`${appUser?.current_streak ?? 0} days`} />
        <StatCard label="Longest Streak" value={`${appUser?.longest_streak ?? 0} days`} />
        <StatCard label="Completion Rate" value={`${((appUser?.completion_rate ?? 0) * 100).toFixed(0)}%`} />
        <StatCard label="Avg Quality" value={`${(appUser?.avg_quality_score ?? 0).toFixed(0)}/100`} />
        <StatCard label="SOL Won" value={`◎${(appUser?.sol_won_total ?? 0).toFixed(3)}`} />
        <StatCard label="SOL Lost" value={`◎${(appUser?.sol_lost_total ?? 0).toFixed(3)}`} />
      </div>

      <p className="text-xs text-muted text-center">
        Full stats dashboard, heatmap, and charts coming in Phase 4.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3">
      <p className="text-[10px] font-medium uppercase text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground font-mono">{value}</p>
    </div>
  );
}
