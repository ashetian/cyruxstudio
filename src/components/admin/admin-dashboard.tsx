"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminHeader, type AdminTab } from "./admin-header";
import { ProductCatalogTable } from "./product-catalog-table";
import { StoreSettingsForm } from "./store-settings-form";
import { MediaAssetsGrid } from "./media-assets-grid";
import { DropManagement } from "./drop-management";
import { AiStudioModal } from "./ai-studio-modal";
import {
  Package,
  Layers,
  Sliders,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
} from "lucide-react";

interface AdminStats {
  activeGarmentCount: number;
  totalStock: number;
  inventoryValuation: number;
  bestsellerCount: number;
  depletedCount: number;
  lowStockCount: number;
  totalDrops: number;
  activeDrop: {
    id: string;
    number: string;
    title: string;
    slug: string;
    status: string;
    totalPieces: number;
    assignedCount: number;
  } | null;
  credits: {
    used: number;
    remaining: number;
    cap: number;
    percentage: number;
  };
  totalAiAssets: number;
  currency: string;
  whatsappNumber: string;
  dbStatus: string;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [currency, setCurrency] = useState<string>("USD");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Quick AI Studio modal target state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalTargetId, setAiModalTargetId] = useState<string | null>(null);

  // Sync tab with URL query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as AdminTab | null;
      if (tabParam && ["products", "drops", "settings", "media", "ai"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Global Desktop Keyboard Shortcuts: 1-5 for switching tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key === "1") {
        e.preventDefault();
        handleTabChange("products");
      } else if (e.key === "2") {
        e.preventDefault();
        handleTabChange("drops");
      } else if (e.key === "3") {
        e.preventDefault();
        handleTabChange("settings");
      } else if (e.key === "4") {
        e.preventDefault();
        handleTabChange("media");
      } else if (e.key === "5") {
        e.preventDefault();
        handleTabChange("ai");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTabChange]);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await fetch("/api/admin/stats");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.currency) {
          setCurrency(data.stats.currency);
        }
      }
    } catch (e) {
      console.warn("Could not retrieve live admin stats:", e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currencySymbol =
    currency === "EUR" ? "€" : currency === "TRY" ? "₺" : currency === "GBP" ? "£" : "$";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAF8F3] font-mono flex flex-col selection:bg-[#FAF8F3] selection:text-[#0A0A0A]">
      {/* 1. Header with Live Telemetry */}
      <AdminHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        adminEmail="admin@cyrux.studio"
        stats={
          stats
            ? {
                activeGarments: stats.activeGarmentCount,
                totalStock: stats.totalStock,
                valuation: stats.inventoryValuation,
                currency: stats.currency,
                creditsRemaining: stats.credits.remaining,
                activeDropNumber: stats.activeDrop?.number,
              }
            : undefined
        }
        onOpenAiStudio={() => {
          setAiModalTargetId(null);
          setActiveTab("ai");
        }}
      />

      {/* 2. Overarching Telemetry Bar (Desktop Fast Matrix) */}
      <div className="hidden lg:block border-b border-[#1A1A1A] bg-[#0E0E0E] px-4 md:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#666] uppercase">CATALOG VALUATION:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {currencySymbol}
                {(stats?.inventoryValuation ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#666] uppercase">ACTIVE PIECES:</span>
              <span className="font-bold text-white font-mono">
                {stats?.activeGarmentCount ?? 0} ITEMS / {stats?.totalStock ?? 0} UNITS
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#666] uppercase">ACTIVE DROP:</span>
              {stats?.activeDrop ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("drops")}
                  className="font-bold text-amber-300 hover:underline uppercase"
                >
                  DROP {stats.activeDrop.number}: {stats.activeDrop.title} ({stats.activeDrop.assignedCount} PCS)
                </button>
              ) : (
                <span className="text-[#888] uppercase">NONE (STANDBY)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#666] uppercase">AI CREDITS:</span>
              <span className="font-bold text-amber-400 font-mono">
                {(stats?.credits.remaining ?? 23000).toLocaleString()} / 23,000 CR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchStats}
              disabled={loadingStats}
              title="Refresh Global Telemetry"
              className="text-[10px] text-[#777] hover:text-white uppercase flex items-center gap-1 border border-[#262626] px-2 py-0.5 disabled:opacity-40"
            >
              <RotateCcw className={`w-2.5 h-2.5 ${loadingStats ? "animate-spin" : ""}`} />
              <span>{loadingStats ? "SYNCING..." : "SYNC TELEMETRY"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Content Surface */}
      <main className="flex-1 px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-7xl w-full mx-auto">
        {/* TAB 01: PRODUCTS */}
        {activeTab === "products" && (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-0.5 sm:gap-1 pb-2 border-b border-[#1E1E1E]">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-xl font-bold uppercase tracking-tight text-[#FAF8F3] flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  <span>[ 01. PRODUCT CATALOG & INVENTORY ]</span>
                </h2>
                <span className="text-[10px] text-[#777] font-mono uppercase hidden sm:inline">
                  KEYBOARD SHORTCUTS: [/] SEARCH • [N] NEW PIECE • [R] REFRESH
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#777777] uppercase tracking-wider">
                LIFECYCLE MANAGEMENT • PRICING, INVENTORY STEPPERS, VARIANTS & BESTSELLER PROMOTIONS
              </p>
            </div>
            <ProductCatalogTable
              currency={currency}
              onOpenAiStudio={(prodId) => {
                setAiModalTargetId(prodId || null);
                setAiModalOpen(true);
              }}
              onMutated={fetchStats}
            />
          </div>
        )}

        {/* TAB 02: DROPS */}
        {activeTab === "drops" && (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-0.5 sm:gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-tight text-[#FAF8F3] flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <span>[ 02. ATELIER DROP SYSTEM & ARCHIVE ]</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-[#777777] uppercase tracking-wider">
                DROP LIFECYCLE MANAGEMENT • ACTIVE / UPCOMING / ARCHIVED RELEASES, PIECE ALLOCATIONS & EDITIONS
              </p>
            </div>
            <DropManagement onDropMutated={fetchStats} />
          </div>
        )}

        {/* TAB 03: SETTINGS */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-0.5 sm:gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-tight text-[#FAF8F3] flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                <span>[ 03. STORE ARCHITECTURE & REDIRECTION ]</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-[#777777] uppercase tracking-wider">
                WHATSAPP ORDERING PARAMETERS • E.164 VALIDATION, CURRENCY PROTOCOL & BRAND ESSENCE
              </p>
            </div>
            <StoreSettingsForm
              onCurrencyChange={(newCurr) => {
                setCurrency(newCurr);
                fetchStats();
              }}
              onSaveSuccess={fetchStats}
            />
          </div>
        )}

        {/* TAB 04: MEDIA */}
        {activeTab === "media" && (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-0.5 sm:gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-tight text-[#FAF8F3] flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <span>[ 04. VERCEL BLOB ASSET VAULT ]</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-[#777777] uppercase tracking-wider">
                HIGH-AVAILABILITY CLOUD ASSET STORAGE • DRAG-AND-DROP INGESTION, MIME WHITELIST & EXPIRY CONTROLS
              </p>
            </div>
            <MediaAssetsGrid />
          </div>
        )}

        {/* TAB 05: AI STUDIO */}
        {activeTab === "ai" && (
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-0.5 sm:gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-tight text-[#FAF8F3] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>[ 05. AI STUDIO // ELEVENLABS FORGE ]</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-[#777777] uppercase tracking-wider">
                SYNTHETIC VISUAL MEDIA FORGE • STRICT 23K BUDGET GUARD, SHA-256 DEDUPLICATION & DIRECT ATTACHMENT
              </p>
            </div>
            <AiStudioModal
              mode="embedded"
              initialTargetType={aiModalTargetId ? "product" : null}
              initialTargetId={aiModalTargetId}
              onAssetAssigned={() => {
                fetchStats();
              }}
              onCreditsChanged={fetchStats}
            />
          </div>
        )}
      </main>

      {/* Standalone Triggered AI Studio Modal */}
      {aiModalOpen && (
        <AiStudioModal
          mode="modal"
          isOpen={true}
          initialTargetType={aiModalTargetId ? "product" : null}
          initialTargetId={aiModalTargetId}
          onClose={() => setAiModalOpen(false)}
          onAssetAssigned={() => {
            fetchStats();
          }}
          onCreditsChanged={fetchStats}
        />
      )}

      {/* Persistent Technical Footnote */}
      <footer className="border-t border-[#1A1A1A] bg-[#0A0A0A] px-4 md:px-8 py-4 text-center text-[10px] text-[#444444] uppercase tracking-widest font-mono">
        CYRUX STUDIO MONOLITH • NEXT.JS 15 EDGE GUARD • VERCEL BLOB VAULT • HS256 SESSION ACTIVE
      </footer>
    </div>
  );
}
