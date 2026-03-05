"use client";

import type { Block } from "@/lib/types";
import { BLOCK_TYPE_COLORS, AI_EXECUTED_COLOR, STATUS_COLORS } from "@/lib/constants";

interface BlockCardProps {
  block: Block;
  onClick: (block: Block) => void;
}

export function BlockCard({ block, onClick }: BlockCardProps) {
  const borderColor =
    block.ai_executed_at ? AI_EXECUTED_COLOR : BLOCK_TYPE_COLORS[block.type];
  const statusColor = STATUS_COLORS[block.status];

  const startTime = new Date(block.start_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const endTime = block.end_time
    ? new Date(block.end_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <button
      onClick={() => onClick(block)}
      className="group flex w-full items-start gap-3 rounded-lg border border-border bg-surface/50 p-3 text-left transition-colors hover:bg-surface-hover"
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      {/* Status dot */}
      <div className="mt-1 flex-shrink-0">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {block.title}
          </span>
          {block.ai_executed_at && (
            <span className="text-gold text-xs" title="AI Executed">
              ⚡
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {/* Time */}
          <span className="text-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {startTime}
            {endTime && ` – ${endTime}`}
          </span>

          {/* Type badge */}
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
            style={{
              backgroundColor: `${borderColor}20`,
              color: borderColor,
            }}
          >
            {block.type}
          </span>

          {/* GCal badge */}
          {block.gcal_event_id && (
            <span className="rounded bg-blue/15 px-1.5 py-0.5 text-[10px] font-medium text-blue">
              GCal
            </span>
          )}

          {/* SOL stake badge */}
          {block.sol_stake_amount > 0 && (
            <span
              className="rounded bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ◎{block.sol_stake_amount}
            </span>
          )}

          {/* Priority badge for high/critical */}
          {(block.priority === "high" || block.priority === "critical") && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                block.priority === "critical"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-amber/15 text-amber"
              }`}
            >
              {block.priority}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
