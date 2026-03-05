"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";
import { BLOCK_TYPE_COLORS, STATUS_COLORS } from "@/lib/constants";

interface BlockDetailModalProps {
  block: Block;
  onClose: () => void;
}

export function BlockDetailModal({ block, onClose }: BlockDetailModalProps) {
  const [tab, setTab] = useState<"details" | "review">("details");
  const [submissionText, setSubmissionText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<{
    score: number;
    feedback: string;
  } | null>(
    block.quality_score !== null
      ? { score: block.quality_score, feedback: block.quality_feedback || "" }
      : null
  );
  const [completing, setCompleting] = useState(false);

  const isGCal = !!block.gcal_event_id;
  const borderColor = BLOCK_TYPE_COLORS[block.type];

  const startTime = new Date(block.start_time).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = block.end_time
    ? new Date(block.end_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/blocks/${block.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        onClose();
      }
    } catch {
      // ignore
    } finally {
      setCompleting(false);
    }
  }

  async function handleReview() {
    if (!submissionText.trim()) return;
    setReviewing(true);
    try {
      const res = await fetch(`/api/blocks/${block.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionText }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewResult({ score: data.score, feedback: data.feedback });
      }
    } catch {
      // ignore
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-border bg-background md:rounded-2xl"
        style={{ borderTopWidth: 3, borderTopColor: borderColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-2">
          <div>
            <h2 className="text-lg font-bold text-foreground">{block.title}</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span
                className="rounded px-1.5 py-0.5 font-medium uppercase"
                style={{ backgroundColor: `${borderColor}20`, color: borderColor }}
              >
                {block.type}
              </span>
              <span className="rounded bg-surface px-1.5 py-0.5 text-muted">
                {block.priority}
              </span>
              <span
                className="rounded px-1.5 py-0.5"
                style={{
                  backgroundColor: `${STATUS_COLORS[block.status]}20`,
                  color: STATUS_COLORS[block.status],
                }}
              >
                {block.status}
              </span>
              {isGCal && (
                <span className="rounded bg-blue/15 px-1.5 py-0.5 text-blue">
                  GCal
                </span>
              )}
              {block.sol_stake_amount > 0 && (
                <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-amber">
                  ◎{block.sol_stake_amount}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted font-mono">
              {startTime}{endTime ? ` – ${endTime}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          <button
            onClick={() => setTab("details")}
            className={`px-3 py-2 text-xs font-medium ${
              tab === "details"
                ? "border-b-2 border-violet text-violet-light"
                : "text-muted"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setTab("review")}
            className={`px-3 py-2 text-xs font-medium ${
              tab === "review"
                ? "border-b-2 border-violet text-violet-light"
                : "text-muted"
            }`}
          >
            Review
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {tab === "details" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Description</label>
                <p className="mt-1 text-sm text-foreground">
                  {block.description || "No description."}
                </p>
              </div>
              {block.scheduled_by === "ai" && (
                <p className="text-xs text-gold">Scheduled by Jarvis</p>
              )}
            </div>
          )}

          {tab === "review" && (
            <div className="space-y-3">
              {reviewResult ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-2xl font-bold font-mono ${
                        reviewResult.score >= 90
                          ? "text-emerald"
                          : reviewResult.score >= 75
                            ? "text-blue"
                            : reviewResult.score >= 50
                              ? "text-amber"
                              : "text-red-400"
                      }`}
                    >
                      {reviewResult.score}
                    </span>
                    <span className="text-xs text-muted">/ 100</span>
                  </div>
                  <p className="text-sm text-foreground">{reviewResult.feedback}</p>
                  <p className="text-[10px] text-muted">Score is final.</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Paste your work submission here..."
                    className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted focus:border-violet focus:outline-none"
                    rows={5}
                  />
                  <button
                    onClick={handleReview}
                    disabled={reviewing || !submissionText.trim()}
                    className="w-full rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white hover:bg-violet-light disabled:opacity-50"
                  >
                    {reviewing ? "Grading..." : "Submit for AI Review"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex gap-2 border-t border-border p-4">
          {block.status !== "completed" && !isGCal && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex-1 rounded-lg bg-emerald/15 px-4 py-2.5 text-sm font-medium text-emerald hover:bg-emerald/25 disabled:opacity-50"
            >
              {completing ? "..." : "Mark Complete"}
            </button>
          )}
          {block.status === "completed" && (
            <span className="flex-1 text-center text-sm text-emerald">Completed</span>
          )}
        </div>
      </div>
    </div>
  );
}
