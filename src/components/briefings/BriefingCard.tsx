"use client";

import { useState, useEffect } from "react";

export function BriefingCard() {
  const [content, setContent] = useState<string | null>(null);
  const [type, setType] = useState<"morning" | "eod" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Check if we should show a briefing
    const hour = new Date().getHours();
    const todayKey = new Date().toISOString().split("T")[0];

    if (hour >= 8 && hour < 10) {
      // Morning briefing window
      const dismissedKey = `briefing-morning-${todayKey}`;
      if (!sessionStorage.getItem(dismissedKey)) {
        setType("morning");
      }
    } else if (hour >= 21) {
      // EOD wrap window
      const dismissedKey = `briefing-eod-${todayKey}`;
      if (!sessionStorage.getItem(dismissedKey)) {
        setType("eod");
      }
    }
  }, []);

  async function generateBriefing() {
    if (!type) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/briefings/${type === "morning" ? "morning" : "eod"}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.content) {
        setContent(data.content);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  }

  function dismiss() {
    if (type) {
      const todayKey = new Date().toISOString().split("T")[0];
      sessionStorage.setItem(`briefing-${type}-${todayKey}`, "dismissed");
    }
    setDismissed(true);
  }

  if (dismissed || !type) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {type === "morning" ? (
              <span className="text-amber">Morning Briefing</span>
            ) : (
              <span className="text-violet-light">EOD Wrap</span>
            )}
          </h2>
          <button onClick={dismiss} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        {content ? (
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="prose prose-sm prose-invert whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {content}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <button
              onClick={generateBriefing}
              disabled={generating}
              className="rounded-lg bg-violet px-6 py-3 text-sm font-semibold text-white hover:bg-violet-light disabled:opacity-50"
            >
              {generating ? "Generating..." : `Generate ${type === "morning" ? "Briefing" : "Wrap"}`}
            </button>
          </div>
        )}

        {content && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 rounded-lg bg-surface px-4 py-2 text-sm text-foreground hover:bg-surface-hover"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
