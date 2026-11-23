"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  LogOut,
  LayoutDashboard,
  Package,
  ShoppingBag,
  FolderKanban,
  Layers,
  Tag,
  Users,
  LayoutTemplate,
  Image as ImageIcon,
  Sliders,
  Sparkles,
} from "lucide-react";

export type AdminTab =
  | "overview"
  | "products"
  | "orders"
  | "collections"
  | "drops"
  | "coupons"
  | "customers"
  | "cms"
  | "media"
  | "settings"
  | "ai";

export interface AdminHeaderProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  adminEmail?: string;
  stats?: {
    activeGarments?: number;
    totalStock?: number;
    valuation?: number;
    pendingOrders?: number;
    totalRevenue?: number;
    currency?: string;
    creditsRemaining?: number;
    activeDropNumber?: string;
  };
  onOpenAiStudio?: () => void;
}

export const ADMIN_TABS: Array<{
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "collections", label: "Collections", icon: FolderKanban },
  { id: "drops", label: "Drops", icon: Layers },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "cms", label: "Storefront", icon: LayoutTemplate },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "settings", label: "Settings", icon: Sliders },
  { id: "ai", label: "AI Studio", icon: Sparkles },
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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const currentTabObj = ADMIN_TABS.find((t) => t.id === activeTab) || ADMIN_TABS[0];
  const currencySymbol =
    stats?.currency === "EUR"
      ? "€"
      : stats?.currency === "TRY"
      ? "₺"
      : stats?.currency === "GBP"
      ? "£"
      : "$";

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E8E4DC] text-[#0A0A0A]">
      {/* Mobile Top Bar (< md) */}
      <div className="flex md:hidden items-center justify-between gap-3 px-4 h-14">
        <div className="min-w-0 flex flex-col">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#0A0A0A] truncate">
            Cyrux Studio
          </span>
          <span className="text-[11px] text-[#525252] truncate">
            {currentTabObj.label}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Storefront"
            className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center gap-1.5 border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A] hover:border-[#0A0A0A] text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <span className="hidden xs:inline">Storefront</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Desktop Header (>= md) */}
      <div className="hidden md:block">
        <div className="px-6 lg:px-8 py-3 border-b border-[#E8E4DC] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#0A0A0A]">
              Cyrux Studio — Atelier Admin
            </span>
            {stats && (
              <div className="flex items-center gap-2.5 text-xs text-[#525252] font-mono border-l border-[#E8E4DC] pl-3">
                <span>{stats.activeGarments ?? 0} Pieces</span>
                <span aria-hidden="true">•</span>
                <span>{stats.pendingOrders ?? 0} Pending Orders</span>
                <span aria-hidden="true">•</span>
                <span className="text-[#0A0A0A] font-medium">
                  {currencySymbol}
                  {(stats.totalRevenue ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  Revenue
                </span>
                {stats.activeDropNumber && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>Drop {stats.activeDropNumber}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#525252] mr-1 hidden lg:inline">
              {adminEmail}
            </span>

            {onOpenAiStudio && (
              <button
                type="button"
                onClick={onOpenAiStudio}
                className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Studio</span>
              </button>
            )}

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <span>View Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>

        {/* Desktop Tab Strip */}
        <nav
          aria-label="Admin sections"
          className="px-6 lg:px-8 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1"
        >
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isCurrent ? "page" : undefined}
                className={`min-h-[44px] shrink-0 whitespace-nowrap px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors cursor-pointer inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  isCurrent
                    ? "border-[#0A0A0A] text-[#0A0A0A] bg-[#FAF8F3]"
                    : "border-transparent text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAF8F3]/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
