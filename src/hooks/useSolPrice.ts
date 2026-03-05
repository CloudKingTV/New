"use client";

import { useState, useEffect } from "react";
import { SOL_PRICE_CACHE_TTL_MS } from "@/lib/constants";

export function useSolPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchPrice() {
      try {
        const res = await fetch("/api/sol-price");
        const data = await res.json();
        if (mounted && data.price) {
          setPrice(data.price);
        }
      } catch {
        // Silently fail — keep existing price
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchPrice();

    // Refresh every 5 minutes
    const interval = setInterval(fetchPrice, SOL_PRICE_CACHE_TTL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { price, loading };
}
