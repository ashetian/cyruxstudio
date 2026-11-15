"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface AdminHeaderProps {
  activeTab: "products" | "settings" | "media" | "drops";
  onTabChange: (tab: "products" | "settings" | "media" | "drops") => void;
  adminEmail?: string;
}

export function AdminHeader({
  activeTab,
  onTabChange,
  adminEmail = "admin@cyrux.studio",
}: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <header className="border-b border-[#222222] bg-[#0E0E0E]">
      {/* Top telemetry banner */}
      <div className="border-b border-[#1A1A1A] px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-widest text-[#FAF8F3] uppercase">
            CYRUX STUDIO — ADMIN CONSOLE
          </span>
          <span className="hidden sm:inline-block text-[#333333]">|</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SYSTEM ONLINE (DATABASE CONNECTED)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#888888] hidden md:inline">
            USER: <span className="text-[#FAF8F3]">{adminEmail}</span>
          </span>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#AAAAAA] hover:text-[#FAF8F3] underline underline-offset-4 tracking-wider uppercase text-[11px]"
          >
            [STOREFRONT ↗]
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-red-400 hover:text-red-300 font-mono text-[11px] uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            {loggingOut ? "[LOGGING OUT...]" : "[LOGOUT ⏻]"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="px-4 md:px-8 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 pt-1">
        <button
          onClick={() => onTabChange("products")}
          className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-3 text-xs tracking-wider uppercase font-bold border-b-2 transition-none cursor-pointer ${
            activeTab === "products"
              ? "border-[#FAF8F3] text-[#FAF8F3] bg-[#161616]"
              : "border-transparent text-[#777777] hover:text-[#CCCCCC] hover:bg-[#121212]"
          }`}
        >
          [ 01. PRODUCTS CATALOG ]
        </button>

        <button
          onClick={() => onTabChange("settings")}
          className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-3 text-xs tracking-wider uppercase font-bold border-b-2 transition-none cursor-pointer ${
            activeTab === "settings"
              ? "border-[#FAF8F3] text-[#FAF8F3] bg-[#161616]"
              : "border-transparent text-[#777777] hover:text-[#CCCCCC] hover:bg-[#121212]"
          }`}
        >
          [ 02. STORE SETTINGS ]
        </button>

        <button
          onClick={() => onTabChange("media")}
          className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-3 text-xs tracking-wider uppercase font-bold border-b-2 transition-none cursor-pointer ${
            activeTab === "media"
              ? "border-[#FAF8F3] text-[#FAF8F3] bg-[#161616]"
              : "border-transparent text-[#777777] hover:text-[#CCCCCC] hover:bg-[#121212]"
          }`}
        >
          [ 03. MEDIA ASSETS ]
        </button>

        <button
          onClick={() => onTabChange("drops")}
          className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-3 text-xs tracking-wider uppercase font-bold border-b-2 transition-none cursor-pointer ${
            activeTab === "drops"
              ? "border-[#FAF8F3] text-[#FAF8F3] bg-[#161616]"
              : "border-transparent text-[#777777] hover:text-[#CCCCCC] hover:bg-[#121212]"
          }`}
        >
          [ 04. DROP SYSTEM ]
        </button>
      </nav>
    </header>
  );
}
