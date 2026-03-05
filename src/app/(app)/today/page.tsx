"use client";

import { useState } from "react";
import { TopBar } from "@/components/today/TopBar";
import { Timeline } from "@/components/today/Timeline";
import { JarvisNotificationBar } from "@/components/today/JarvisNotificationBar";
import { BlockDetailModal } from "@/components/blocks/BlockDetailModal";
import { BriefingCard } from "@/components/briefings/BriefingCard";
import { useBlocks } from "@/hooks/useBlocks";
import type { Block } from "@/lib/types";

export default function TodayPage() {
  const today = new Date().toISOString().split("T")[0];
  const { blocks, loading, refetch } = useBlocks(today);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  return (
    <div className="relative z-10">
      {/* Briefing card overlay */}
      <BriefingCard />

      <TopBar />
      <JarvisNotificationBar />

      {/* Timeline */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet border-t-transparent" />
          </div>
        ) : blocks.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <p className="text-muted text-sm">No blocks scheduled today.</p>
            <p className="text-muted mt-1 text-xs">
              Open AI Chat to schedule your day.
            </p>
          </div>
        ) : (
          <Timeline
            blocks={blocks}
            onBlockClick={(block) => setSelectedBlock(block)}
          />
        )}
      </div>

      {/* Block Detail Modal */}
      {selectedBlock && (
        <BlockDetailModal
          block={selectedBlock}
          onClose={() => {
            setSelectedBlock(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
