"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminHeader, ADMIN_TABS, type AdminTab } from "./admin-header";
import { AdminBottomNav } from "./admin-bottom-nav";
import { AdminBottomSheet } from "./admin-bottom-sheet";
import { AdminOverview, type AdminOverviewStats } from "./admin-overview";
import { ProductCatalogTable } from "./product-catalog-table";
import { OrdersManager } from "./orders-manager";
import { CollectionsManager } from "./collections-manager";
import { DropManagement } from "./drop-management";
import { CouponsManager } from "./coupons-manager";
import { CustomersManager } from "./customers-manager";
import { CmsStudio } from "./cms-studio";
import { MediaAssetsGrid } from "./media-assets-grid";
import { StoreSettingsForm } from "./store-settings-form";
import { AiStudioModal } from "./ai-studio-modal";
import { ExternalLink, LogOut } from "lucide-react";

const ALL_TABS: ReadonlyArray<AdminTab> = [
  "overview",
  "products",
  "orders",
  "collections",
  "drops",
  "coupons",
  "customers",
  "cms",
  "media",
  "settings",
  "ai",
];

const SECONDARY_TABS: ReadonlyArray<AdminTab> = [
  "collections",
  "drops",
  "coupons",
  "customers",
  "media",
  "settings",
  "ai",
];

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [currency, setCurrency] = useState<string>("EUR");
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [selectedCustomerIdForOrders, setSelectedCustomerIdForOrders] =
    useState<string | null>(null);
  const [initialEditProductId, setInitialEditProductId] = useState<string | null>(
    null
  );

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalTargetId, setAiModalTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as AdminTab | null;
      if (tabParam && ALL_TABS.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    setMoreSheetOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setStatsError(null);
      const res = await fetch("/api/admin/stats");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        stats?: AdminOverviewStats;
        error?: string;
      };
      if (res.ok && data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.currency) {
          setCurrency(data.stats.currency);
        }
      } else {
        setStatsError(data.error || "Failed to load overview metrics.");
      }
    } catch {
      setStatsError("Network error loading overview metrics.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCurrencyChange = useCallback((newCurr: string) => {
    setCurrency(newCurr);
  }, []);

  const handleSettingsSaveSuccess = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const currencySymbol =
    currency === "EUR"
      ? "€"
      : currency === "TRY"
      ? "₺"
      : currency === "GBP"
      ? "£"
      : "$";

  const secondaryTabObjects = ADMIN_TABS.filter((t) =>
    SECONDARY_TABS.includes(t.id)
  );

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#0A0A0A] font-sans flex flex-col overflow-x-hidden selection:bg-black selection:text-[#FAF8F3]">
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
                pendingOrders: stats.pendingOrders,
                totalRevenue: stats.totalRevenue,
                currency: stats.currency,
                creditsRemaining: stats.credits.remaining,
                activeDropNumber: stats.activeDrop?.number,
              }
            : undefined
        }
        onOpenAiStudio={() => {
          setAiModalTargetId(null);
          handleTabChange("ai");
        }}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 pb-24 md:pb-10">
        {activeTab === "overview" && (
          <AdminOverview
            stats={stats}
            loading={loadingStats}
            error={statsError}
            currencySymbol={currencySymbol}
            onNavigate={handleTabChange}
            onEditProduct={(prodId) => {
              setInitialEditProductId(prodId);
              handleTabChange("products");
            }}
            onRefresh={fetchStats}
          />
        )}

        {activeTab === "products" && (
          <ProductCatalogTable
            currency={currency}
            initialEditProductId={initialEditProductId}
            onClearInitialEditProduct={() => setInitialEditProductId(null)}
            onOpenAiStudio={(prodId) => {
              setAiModalTargetId(prodId || null);
              setAiModalOpen(true);
            }}
            onMutated={fetchStats}
          />
        )}

        {activeTab === "orders" && (
          <OrdersManager
            currency={currency}
            initialCustomerId={selectedCustomerIdForOrders}
            onClearCustomerFilter={() => setSelectedCustomerIdForOrders(null)}
            onMutated={fetchStats}
            onNavigateToCustomer={() => handleTabChange("customers")}
          />
        )}

        {activeTab === "collections" && (
          <CollectionsManager onMutated={fetchStats} />
        )}

        {activeTab === "drops" && (
          <DropManagement onDropMutated={fetchStats} />
        )}

        {activeTab === "coupons" && (
          <CouponsManager currency={currency} onMutated={fetchStats} />
        )}

        {activeTab === "customers" && (
          <CustomersManager
            currency={currency}
            onMutated={fetchStats}
            onFilterOrdersByCustomer={(custId) => {
              setSelectedCustomerIdForOrders(custId);
              handleTabChange("orders");
            }}
          />
        )}

        {activeTab === "cms" && (
          <CmsStudio initialSection="hero" onSaved={fetchStats} />
        )}

        {activeTab === "media" && <MediaAssetsGrid />}

        {activeTab === "settings" && (
          <StoreSettingsForm
            onCurrencyChange={handleCurrencyChange}
            onSaveSuccess={handleSettingsSaveSuccess}
          />
        )}

        {activeTab === "ai" && (
          <AiStudioModal
            mode="embedded"
            initialTargetType={aiModalTargetId ? "product" : null}
            initialTargetId={aiModalTargetId}
            onAssetAssigned={() => {
              fetchStats();
            }}
            onCreditsChanged={fetchStats}
          />
        )}
      </main>

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

      <AdminBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenMore={() => setMoreSheetOpen(true)}
        moreOpen={moreSheetOpen}
        pendingOrdersCount={stats?.pendingOrders ?? 0}
      />

      <AdminBottomSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Atelier Modules"
        subtitle="Catalog, campaigns, media, and settings"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            {secondaryTabObjects.map((tab) => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`min-h-[52px] px-3 py-3 border text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                    isCurrent
                      ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                      : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E8E4DC] flex flex-col gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMoreSheetOpen(false)}
              className="min-h-[44px] px-4 border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <span>View Public Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="min-h-[44px] px-4 border border-red-300 bg-red-50 text-red-900 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </AdminBottomSheet>
    </div>
  );
}
