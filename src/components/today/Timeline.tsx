"use client";

import type { Block } from "@/lib/types";
import { BlockCard } from "./BlockCard";
import { WORKING_HOURS } from "@/lib/constants";

interface TimelineProps {
  blocks: Block[];
  onBlockClick: (block: Block) => void;
}

export function Timeline({ blocks, onBlockClick }: TimelineProps) {
  const hours = Array.from(
    { length: WORKING_HOURS.end - WORKING_HOURS.start },
    (_, i) => i + WORKING_HOURS.start
  );

  // Group blocks by hour
  function getBlocksForHour(hour: number): Block[] {
    return blocks.filter((block) => {
      const blockHour = new Date(block.start_time).getHours();
      return blockHour === hour;
    });
  }

  function formatHour(hour: number): string {
    if (hour === 0 || hour === 24) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  }

  return (
    <div className="space-y-0">
      {hours.map((hour) => {
        const hourBlocks = getBlocksForHour(hour);
        return (
          <div key={hour} className="flex gap-3 border-t border-border/50 px-4">
            {/* Hour label */}
            <div
              className="w-14 flex-shrink-0 py-3 text-right text-xs text-muted"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatHour(hour)}
            </div>

            {/* Blocks in this hour */}
            <div className="flex-1 space-y-2 py-2">
              {hourBlocks.length > 0 ? (
                hourBlocks.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    onClick={onBlockClick}
                  />
                ))
              ) : (
                <div className="h-8" /> // Empty spacer
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
