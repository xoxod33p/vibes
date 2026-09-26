"use client";

import React, { useState } from "react";
import { User, Lock, Mail, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/lib/audio-context";
import { toast } from "sonner";

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
  const [error, setError] = useState<string | null>(null);

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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

        {/* Tab Switcher */}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-2">
          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-300">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#131722] border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
          </div>

          {/* Email (Optional, register only) */}
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

          {/* Password */}
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
            disabled={loading}
            className="w-full mt-2"
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
