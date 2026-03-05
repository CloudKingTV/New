"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JarvisNotification } from "@/lib/types";

export function useNotifications() {
  const [latest, setLatest] = useState<JarvisNotification | null>(null);
  const supabase = createClient();

  const fetchLatest = useCallback(async () => {
    const { data } = await supabase
      .from("jarvis_notifications")
      .select("*")
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setLatest(data as JarvisNotification | null);
  }, [supabase]);

  const dismiss = useCallback(async (id: string) => {
    await supabase
      .from("jarvis_notifications")
      .update({ dismissed: true })
      .eq("id", id);
    setLatest(null);
  }, [supabase]);

  useEffect(() => {
    fetchLatest();

    // Realtime subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jarvis_notifications" },
        () => fetchLatest()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLatest, supabase]);

  return { latest, dismiss };
}
