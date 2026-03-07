"use client";

import { useAuth } from "@/providers/AuthProvider";

export default function ProfilePage() {
  const { appUser, signOut } = useAuth();

  return (
    <div className="relative z-10 px-4 py-6 space-y-6">
      <h1
        className="text-xl font-bold text-foreground"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        Profile
      </h1>

      {/* User info */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
        {appUser?.wallet_address && (
          <div>
            <label className="text-[10px] font-medium uppercase text-muted">Wallet</label>
            <p className="text-xs text-foreground font-mono truncate">
              {appUser.wallet_address}
            </p>
          </div>
        )}
        <div>
          <label className="text-[10px] font-medium uppercase text-muted">Timezone</label>
          <p className="text-sm text-foreground">{appUser?.timezone || "America/New_York"}</p>
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase text-muted">Morning Briefing</label>
          <p className="text-sm text-foreground">{appUser?.morning_briefing_time || "09:00"}</p>
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase text-muted">EOD Wrap</label>
          <p className="text-sm text-foreground">{appUser?.eod_wrap_time || "21:00"}</p>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold text-foreground">Google Calendar</h2>
        {appUser?.gcal_refresh_token ? (
          <p className="mt-2 text-xs text-emerald">Connected (syncing every 15 min)</p>
        ) : (
          <a
            href={`/api/gcal/auth?userId=${appUser?.id || ""}`}
            className="mt-2 inline-block rounded-lg bg-blue/15 px-4 py-2 text-xs font-medium text-blue hover:bg-blue/25"
          >
            Connect Google Calendar
          </a>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-sm text-muted hover:border-red-500/30 hover:text-red-400"
      >
        Sign Out
      </button>
    </div>
  );
}
