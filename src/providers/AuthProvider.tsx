"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { User } from "@/lib/types";
import bs58 from "bs58";

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  appUser: User | null;
  session: Session | null;
  loading: boolean;
  signInWithWallet: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { publicKey, signMessage, disconnect } = useWallet();
  const supabase = createClient();

  // Fetch app user profile from our users table
  const fetchAppUser = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      setAppUser(data);
    },
    [supabase]
  );

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("[Auth] onAuthStateChange:", _event, "session:", !!session, "user:", session?.user?.id);
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        await fetchAppUser(session.user.id);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Auth] getSession:", "session:", !!session, "user:", session?.user?.id);
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchAppUser(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchAppUser]);

  const signInWithWallet = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error("Wallet not connected");
    }

    const walletAddress = publicKey.toBase58();
    const nonce = crypto.randomUUID();
    const message = new TextEncoder().encode(
      `Sign in to CloudKing OS\nNonce: ${nonce}\nWallet: ${walletAddress}`
    );
    const signature = await signMessage(message);

    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        signature: bs58.encode(signature),
        message: bs58.encode(message),
        nonce,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Wallet verification failed");
    }

    const { access_token, refresh_token } = await response.json();
    console.log("[Auth] setSession called, has tokens:", !!access_token, !!refresh_token);
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    console.log("[Auth] setSession result:", "session:", !!data.session, "error:", error?.message, "user:", data.session?.user?.id);
  }, [publicKey, signMessage, supabase]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    [supabase]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await disconnect();
    setAppUser(null);
  }, [supabase, disconnect]);

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        appUser,
        session,
        loading,
        signInWithWallet,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
