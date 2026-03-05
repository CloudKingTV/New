"use client";

import { useNotifications } from "@/hooks/useNotifications";

export function JarvisNotificationBar() {
  const { latest, dismiss } = useNotifications();

  if (!latest) return null;

  const typeColors: Record<string, string> = {
    schedule: "border-violet/40 bg-violet/10 text-violet-light",
    reschedule: "border-amber/40 bg-amber/10 text-amber",
    complete: "border-emerald/40 bg-emerald/10 text-emerald",
    reminder: "border-blue/40 bg-blue/10 text-blue",
    briefing: "border-gold/40 bg-gold/10 text-gold",
  };

  const colorClass = typeColors[latest.type] || typeColors.schedule;

  return (
    <div className={`mx-4 mt-3 flex items-center gap-3 rounded-lg border px-4 py-2.5 ${colorClass}`}>
      <span className="text-xs font-bold">J</span>
      <span className="flex-1 text-xs">{latest.message}</span>
      <button
        onClick={() => dismiss(latest.id)}
        className="flex-shrink-0 text-xs opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
