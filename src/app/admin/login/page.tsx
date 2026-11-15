"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@cyrux.studio");
  const [password, setPassword] = useState("AdminSecret2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "ACCESS DENIED: INVALID ADMIN CREDENTIALS");
        setLoading(false);
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError("NETWORK ERROR: FAILED TO CONNECT TO AUTH GATEWAY");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 relative bg-[#0A0A0A]">
      {/* Brutalist Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #222222 1px, transparent 1px), linear-gradient(to bottom, #222222 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs tracking-widest text-[#888888]">
            <span>CYRUX STUDIO — GATE</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SESSION GUARD
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FAF8F3] uppercase">
            [ 00. ADMIN AUTH ]
          </h1>
          <p className="text-xs text-[#666666] tracking-wider uppercase">
            RESTRICTED TERMINAL — CRYPTOGRAPHIC HS256 SESSION ISSUANCE
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#121212] border border-[#262626] p-5 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-6 bg-red-950/40 border border-red-500/80 text-red-300 font-mono text-xs p-3 uppercase tracking-wider">
              [!] {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="admin-email"
                className="text-xs font-bold tracking-wider text-[#AAAAAA] uppercase"
              >
                ADMIN IDENTIFIER (EMAIL)
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ADMIN@CYRUX.STUDIO"
                required
                autoFocus
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] font-mono text-base sm:text-sm px-4 py-3 rounded-none uppercase outline-none placeholder:text-[#444444]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="admin-password"
                  className="text-xs font-bold tracking-wider text-[#AAAAAA] uppercase"
                >
                  MASTER PASSPHRASE
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] tracking-widest text-[#888888] hover:text-[#FAF8F3] uppercase"
                >
                  [{showPassword ? "HIDE" : "SHOW"}]
                </button>
              </div>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] font-mono text-base sm:text-sm px-4 py-3 rounded-none outline-none placeholder:text-[#444444]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full min-h-12 bg-[#FAF8F3] text-[#0A0A0A] hover:bg-white font-mono font-bold text-sm uppercase py-3.5 tracking-wider rounded-none transition-none cursor-pointer disabled:opacity-50"
            >
              {loading ? "[ AUTHENTICATING SESSION... ]" : "[ ACCESS TERMINAL → ]"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-2 text-center">
          <Link
            href="/"
            className="text-xs tracking-wider text-[#888888] hover:text-[#FAF8F3] uppercase underline underline-offset-4"
          >
            ← RETURN TO CYRUX PUBLIC STOREFRONT
          </Link>
          <span className="text-[10px] text-[#444444] tracking-widest uppercase">
            JOSE JWT HS256 • HTTPONLY SAMESITE=LAX PERSISTENT COOKIE
          </span>
        </div>
      </div>
    </main>
  );
}
