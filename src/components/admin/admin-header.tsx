"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ExternalLink,
  LogOut,
  Package,
  Sliders,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

export type AdminTab = "products" | "drops" | "settings" | "media" | "ai";

export interface AdminHeaderProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  adminEmail?: string;
  stats?: {
    activeGarments?: number;
    totalStock?: number;
    valuation?: number;
    currency?: string;
    creditsRemaining?: number;
    activeDropNumber?: string;
  };
  onOpenAiStudio?: () => void;
}

const TABS: Array<{
  id: AdminTab;
  number: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "products", number: "01", label: "PRODUCT CATALOG", icon: Package },
  { id: "drops", number: "02", label: "ATELIER DROPS", icon: Layers },
  { id: "settings", number: "03", label: "STORE SETTINGS", icon: Sliders },
  { id: "media", number: "04", label: "BLOB VAULT", icon: ImageIcon },
  { id: "ai", number: "05", label: "AI STUDIO", icon: Sparkles },
];

export function AdminHeader({
  activeTab,
  onTabChange,
  adminEmail = "admin@cyrux.studio",
  stats,
  onOpenAiStudio,
}: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const handleTabSelect = (tab: AdminTab) => {
    onTabChange(tab);
    setMobileDrawerOpen(false);
  };

  const currentTabObj = TABS.find((t) => t.id === activeTab) || TABS[0];
  const currencySymbol =
    stats?.currency === "EUR"
      ? "€"
      : stats?.currency === "TRY"
      ? "₺"
      : stats?.currency === "GBP"
      ? "£"
      : "$";

  return (
    <header className="border-b border-[#222222] bg-[#0E0E0E] sticky top-0 z-40">
      {/* ============================================================== */}
      {/* 1. MOBILE TOP APP BAR (< md)                                    */}
      {/* ============================================================== */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-[#1A1A1A] bg-[#0A0A0A]">
        {/* Brand & Live Indicator */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open Navigation Menu"
            className="w-10 h-10 -ml-1 flex items-center justify-center text-[#FAF8F3] hover:bg-[#1A1A1A] border border-[#2E2E2E] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="font-bold tracking-widest text-[#FAF8F3] text-xs uppercase leading-tight font-mono">
              CYRUX // ADMIN
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[9px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>

        {/* Current Active Tab Pill & Storefront trigger */}
        <div className="flex items-center gap-2 font-mono">
          <div className="px-2.5 py-1 bg-[#161616] border border-[#333333] text-[10px] text-[#FAF8F3] font-bold uppercase tracking-wider">
            [{currentTabObj.number}. {currentTabObj.id.slice(0, 4)}]
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Storefront"
            className="w-9 h-9 flex items-center justify-center text-[#888888] hover:text-[#FAF8F3] border border-[#222222] bg-[#121212]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DESKTOP HEADER (>= md)                                      */}
      {/* ============================================================== */}
      <div className="hidden md:block">
        {/* Top telemetry banner */}
        <div className="border-b border-[#1A1A1A] px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-widest text-[#FAF8F3] uppercase">
              CYRUX STUDIO — ADMIN CONSOLE
            </span>
            <span className="text-[#333333]">|</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ONLINE (DATABASE CONNECTED)
            </span>

            {/* Quick Live Stats Ticker */}
            {stats && (
              <>
                <span className="text-[#333333]">|</span>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#888]">
                  <span>
                    PIECES: <strong className="text-white">{stats.activeGarments ?? 0}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    STOCK: <strong className="text-white">{stats.totalStock ?? 0}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    VALUATION:{" "}
                    <strong className="text-emerald-400">
                      {currencySymbol}
                      {(stats.valuation ?? 0).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </strong>
                  </span>
                  {stats.activeDropNumber && (
                    <>
                      <span>•</span>
                      <span>
                        ACTIVE: <strong className="text-amber-300">DROP {stats.activeDropNumber}</strong>
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {/* Quick AI Studio Button */}
            <button
              type="button"
              onClick={() => (onOpenAiStudio ? onOpenAiStudio() : onTabChange("ai"))}
              className={`text-[11px] uppercase tracking-wider px-2 py-1 border flex items-center gap-1 cursor-pointer transition-none ${
                activeTab === "ai"
                  ? "bg-amber-400 text-black border-amber-400 font-bold"
                  : "bg-[#141414] text-amber-300 hover:text-white border-amber-400/40 hover:border-amber-400"
              }`}
            >
              <Zap className="w-3 h-3 fill-amber-400" />
              <span>AI STUDIO</span>
              {stats?.creditsRemaining !== undefined && (
                <span className="text-[10px] font-mono opacity-80">
                  ({stats.creditsRemaining.toLocaleString()} CR)
                </span>
              )}
            </button>

            <span className="text-[#888888]">
              USER: <span className="text-[#FAF8F3]">{adminEmail}</span>
            </span>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#AAAAAA] hover:text-[#FAF8F3] underline underline-offset-4 tracking-wider uppercase text-[11px] flex items-center gap-1"
            >
              <span>[STOREFRONT]</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-red-400 hover:text-red-300 font-mono text-[11px] uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>{loggingOut ? "[LOGGING OUT...]" : "[LOGOUT]"}</span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="px-4 md:px-8 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 pt-1 font-mono">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-3 text-xs tracking-wider uppercase font-bold border-b-2 transition-none cursor-pointer flex items-center gap-2 ${
                  isCurrent
                    ? "border-[#FAF8F3] text-[#FAF8F3] bg-[#161616]"
                    : "border-transparent text-[#777777] hover:text-[#CCCCCC] hover:bg-[#121212]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-white" : "text-[#777777]"}`} />
                <span>[ {tab.number}. {tab.label} ]</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ============================================================== */}
      {/* 3. MOBILE SLIDE-OUT DRAWER                                     */}
      {/* ============================================================== */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <div className="relative w-[85vw] max-w-xs bg-[#0C0C0C] border-r border-[#262626] h-full flex flex-col justify-between p-5 z-10 font-mono text-xs">
            {/* Top Header of Drawer */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#202020]">
                <div>
                  <h3 className="font-bold text-sm tracking-widest text-[#FAF8F3] uppercase">
                    CYRUX // ADMIN
                  </h3>
                  <p className="text-[10px] text-[#666666] uppercase mt-0.5">
                    CONTROL MATRIX V2.5
                  </p>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close menu"
                  className="w-10 h-10 flex items-center justify-center border border-[#2E2E2E] text-[#AAAAAA] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Ribbon */}
              <div className="bg-[#121212] border border-[#222222] p-3 flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[#666666]">SESSION</span>
                <span className="text-[#FAF8F3] font-bold text-[11px] truncate">{adminEmail}</span>
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE • RESILIENT DB ACTIVE</span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-[#555555] uppercase tracking-widest px-1">
                  MODULES
                </span>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isCurrent = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`min-h-[50px] px-4 py-3 text-left font-bold uppercase tracking-wider flex items-center justify-between border transition-none cursor-pointer ${
                        isCurrent
                          ? "bg-[#1C1C1C] text-white border-white"
                          : "bg-[#111111] text-[#888888] border-[#222222] hover:text-white hover:border-[#444444]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isCurrent ? "text-white" : "text-[#777777]"}`} />
                        <span>{tab.number}. {tab.label}</span>
                      </div>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions of Drawer */}
            <div className="pt-4 border-t border-[#202020] flex flex-col gap-2.5">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileDrawerOpen(false)}
                className="min-h-[44px] flex items-center justify-center gap-2 bg-[#141414] hover:bg-[#1E1E1E] text-[#AAAAAA] hover:text-white border border-[#2E2E2E] uppercase font-bold text-[11px] tracking-wider"
              >
                <span>STOREFRONT PREVIEW</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="min-h-[44px] flex items-center justify-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 uppercase font-bold text-[11px] tracking-wider cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loggingOut ? "LOGGING OUT..." : "TERMINATE SESSION"}</span>
              </button>

              <span className="text-center text-[9px] text-[#444444] uppercase tracking-widest pt-1">
                CYRUX MONOLITH • EDGE SECURED
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
