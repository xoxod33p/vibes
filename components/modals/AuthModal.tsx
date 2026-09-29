"use client";

import React, { useState } from "react";
import { User, Lock, Mail, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/lib/audio-context";
import { toast } from "sonner";
import { auth, googleProvider } from "@/lib/firebase-client";
import { signInWithPopup } from "firebase/auth";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { refreshUser } = useAudio();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          try {
            localStorage.setItem("vibes_token", data.token);
          } catch {}
        }
        toast.success(
          data.user?.username
            ? `Welcome, ${data.user.username}!`
            : "Successfully signed in with Google!"
        );
        await refreshUser();
        onOpenChange(false);
      } else {
        setError(data.error || "Failed to authenticate with Google");
      }
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr.code !== "auth/popup-closed-by-user" && authErr.code !== "auth/cancelled-popup-request") {
        setError(authErr.message || "Failed to sign in with Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { username, password } : { username, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          try {
            localStorage.setItem("vibes_token", data.token);
          } catch {}
        }
        toast.success(mode === "login" ? `Welcome back, ${data.user.username}!` : `Account created! Welcome, ${data.user.username}!`);
        await refreshUser();
        onOpenChange(false);
        setUsername("");
        setEmail("");
        setPassword("");
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="flex justify-center pt-2 pb-1">
          <img
            src="/logo.png"
            alt="Vibes Logo"
            className="h-9 w-auto object-contain mix-blend-screen select-none"
          />
        </div>
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            {mode === "login" ? "Welcome Back" : "Join Vibes"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-neutral-400">
            {mode === "login"
              ? "Sign in to access your playlists and favorites"
              : "Create an account to save playlists and personalized settings"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex p-1 rounded-xl glass-pill">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === "login" ? "bg-[var(--accent-primary)] text-white shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === "register" ? "bg-[var(--accent-primary)] text-white shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
                </span>
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center my-0.5">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#181d2a] px-2 text-[10px] uppercase tracking-wider text-neutral-400 absolute">
              or
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-300">
              {mode === "login" ? "Username or Email" : "Username"}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === "login" ? "Enter username or email" : "Enter username"}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-300">Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="default"
            size="default"
            disabled={loading || googleLoading}
            className="w-full mt-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
