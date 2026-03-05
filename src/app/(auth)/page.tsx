"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/providers/AuthProvider";

export default function AuthPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { signInWithWallet, signInWithEmail, signUpWithEmail, loading } =
    useAuth();
  const [mode, setMode] = useState<"wallet" | "email">("wallet");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleWalletAuth() {
    try {
      setError("");
      setSubmitting(true);
      await signInWithWallet();
      router.push("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet auth failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError("");
      setSubmitting(true);
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            <span className="text-violet-light">Cloud</span>
            <span className="text-foreground">King</span>
            <span className="text-muted ml-2 text-lg font-normal">OS</span>
          </h1>
          <p className="mt-2 text-muted text-sm">Personal Command Center</p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex rounded-lg bg-surface p-1">
          <button
            onClick={() => setMode("wallet")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "wallet"
                ? "bg-violet text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Wallet
          </button>
          <button
            onClick={() => setMode("email")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "email"
                ? "bg-violet text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            Email
          </button>
        </div>

        {/* Wallet Auth */}
        {mode === "wallet" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
            {connected && (
              <button
                onClick={handleWalletAuth}
                disabled={submitting}
                className="w-full rounded-lg bg-violet px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-light disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Sign Message & Enter"}
              </button>
            )}
          </div>
        )}

        {/* Email Auth */}
        {mode === "email" && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-violet focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-violet focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-violet px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-light disabled:opacity-50"
            >
              {submitting
                ? "Loading..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-xs text-muted hover:text-foreground"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
