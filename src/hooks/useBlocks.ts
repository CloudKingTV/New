"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Block } from "@/lib/types";

export function useBlocks(date: string) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchBlocks = useCallback(async () => {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setBlocks(data as Block[]);
    }
    setLoading(false);
  }, [date, supabase]);

  useEffect(() => {
    fetchBlocks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("blocks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks" },
        () => fetchBlocks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBlocks, supabase]);

  return { blocks, loading, refetch: fetchBlocks };
}
