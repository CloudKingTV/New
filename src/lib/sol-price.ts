import { SOL_PRICE_CACHE_TTL_MS } from "./constants";
import type { SupabaseClient } from "@supabase/supabase-js";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSolPrice(supabaseAdmin: SupabaseClient<any>): Promise<number> {
  // Check cache first
  const { data: cached } = await supabaseAdmin
    .from("sol_price_cache")
    .select("id, price_usd, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < SOL_PRICE_CACHE_TTL_MS) {
      return Number(cached.price_usd);
    }
  }

  // Fetch fresh price
  try {
    const headers: Record<string, string> = {};
    if (process.env.COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
    }

    const response = await fetch(COINGECKO_URL, { headers });
    const data = await response.json();
    const price = data?.solana?.usd;

    if (typeof price !== "number") {
      // Return cached price as fallback
      return cached ? Number(cached.price_usd) : 0;
    }

    // Upsert cache
    if (cached) {
      await supabaseAdmin
        .from("sol_price_cache")
        .update({ price_usd: price, fetched_at: new Date().toISOString() })
        .eq("id", cached.id);
    } else {
      await supabaseAdmin
        .from("sol_price_cache")
        .insert({ price_usd: price });
    }

    return price;
  } catch {
    return cached ? Number(cached.price_usd) : 0;
  }
}
