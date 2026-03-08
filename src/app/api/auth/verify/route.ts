import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import nacl from "tweetnacl";
import bs58 from "bs58";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Deterministic password derived from wallet + server secret
function derivePassword(walletAddress: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) || "";
  return `ck_${walletAddress}_${secret}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { walletAddress, signature, message, nonce } = await request.json();

    if (!walletAddress || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the signature
    const messageBytes = bs58.decode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Verify the message contains the expected wallet and nonce
    const messageText = new TextDecoder().decode(messageBytes);
    if (!messageText.includes(walletAddress) || !messageText.includes(nonce)) {
      return NextResponse.json(
        { error: "Message content mismatch" },
        { status: 401 }
      );
    }

    const email = `${walletAddress}@wallet.cloudking.os`;
    const password = derivePassword(walletAddress);

    // Try to sign in first (existing user)
    const { data: signInData } =
      await supabase.auth.signInWithPassword({ email, password });

    let accessToken: string;
    let refreshToken: string;

    if (signInData?.session) {
      accessToken = signInData.session.access_token;
      refreshToken = signInData.session.refresh_token;
    } else {
      // User doesn't exist — create auth user with password
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { wallet_address: walletAddress },
        });

      if (createError) throw createError;

      // Create user profile in our users table
      await supabase.from("users").insert({
        id: newUser.user.id,
        wallet_address: walletAddress,
      });

      // Sign in the newly created user
      const { data: sessionData, error: sessionError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (sessionError) throw sessionError;

      accessToken = sessionData.session!.access_token;
      refreshToken = sessionData.session!.refresh_token;
    }

    // Set the session cookies server-side so they persist for subsequent requests
    const serverSupabase = await createServerSupabaseClient();
    await serverSupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
