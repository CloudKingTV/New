import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSolPrice } from "@/lib/sol-price";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const price = await getSolPrice(supabase);
    return NextResponse.json({ price });
  } catch {
    return NextResponse.json({ error: "Failed to fetch SOL price" }, { status: 500 });
  }
}
