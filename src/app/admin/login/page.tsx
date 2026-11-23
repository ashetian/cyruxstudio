"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({
          email: identifier.trim(),
          password: password.trim(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid administrator credentials.");
        setLoading(false);
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError("Network error while signing in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-12 bg-[#FAF8F3] text-[#0A0A0A]">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center sm:text-left">
          <span className="text-xs font-medium tracking-widest uppercase text-[#525252]">
            Cyrux Studio
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0A0A0A]">
            Atelier Admin
          </h1>
          <p className="text-sm text-[#525252]">
            Sign in to manage catalog, orders, and storefront content.
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-6 sm:p-8">
          {error && (
            <div
              role="alert"
              className="mb-5 bg-red-50 border border-red-300 text-red-900 text-sm p-3.5 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-identifier"
                className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]"
              >
                Email or Username
              </label>
              <input
                id="admin-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@cyrux.studio or username"
                required
                autoFocus
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base px-4 py-3 rounded-none placeholder:text-[#737373]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="admin-password"
                  className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="min-h-[44px] min-w-[44px] px-3 text-xs font-medium text-[#525252] hover:text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base px-4 py-3 rounded-none placeholder:text-[#737373]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full min-h-[48px] bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] font-medium text-sm uppercase tracking-wider py-3 px-4 rounded-none cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="flex justify-center">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 text-xs font-medium uppercase tracking-wider text-[#525252] hover:text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
