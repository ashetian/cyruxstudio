"use client";

import React from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LayoutTemplate,
  Grid2X2,
} from "lucide-react";
import type { AdminTab } from "./admin-header";

export interface AdminBottomNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onOpenMore: () => void;
  moreOpen: boolean;
  pendingOrdersCount?: number;
}

const SECONDARY_TABS: ReadonlyArray<AdminTab> = [
  "collections",
  "drops",
  "coupons",
  "customers",
  "media",
  "settings",
  "ai",
];

export function AdminBottomNav({
  activeTab,
  onTabChange,
  onOpenMore,
  moreOpen,
  pendingOrdersCount = 0,
}: AdminBottomNavProps) {
  const isMoreActive = moreOpen || SECONDARY_TABS.includes(activeTab);

  const navButtonClass = (isActive: boolean) =>
    `min-h-[44px] min-w-[44px] w-full h-full flex flex-col items-center justify-center gap-1 border-t-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A] ${
      isActive
        ? "border-[#0A0A0A] text-[#0A0A0A] bg-[#FAF8F3]/60"
        : "border-transparent text-[#737373] hover:text-[#0A0A0A]"
    }`;

  return (
    <nav
      aria-label="Primary admin navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E8E4DC] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        <button
          type="button"
          onClick={() => onTabChange("overview")}
          aria-current={!moreOpen && activeTab === "overview" ? "page" : undefined}
          className={navButtonClass(!moreOpen && activeTab === "overview")}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span className="text-[10px] font-medium tracking-wide leading-none">
            Overview
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("products")}
          aria-current={!moreOpen && activeTab === "products" ? "page" : undefined}
          className={navButtonClass(!moreOpen && activeTab === "products")}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="text-[10px] font-medium tracking-wide leading-none">
            Products
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("orders")}
          aria-current={!moreOpen && activeTab === "orders" ? "page" : undefined}
          className={`${navButtonClass(!moreOpen && activeTab === "orders")} relative`}
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-[#0A0A0A] text-[#FFFFFF] text-[9px] font-mono font-semibold rounded-full flex items-center justify-center leading-none">
                {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide leading-none">
            Orders
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("cms")}
          aria-current={!moreOpen && activeTab === "cms" ? "page" : undefined}
          className={navButtonClass(!moreOpen && activeTab === "cms")}
        >
          <LayoutTemplate className="w-4 h-4 shrink-0" />
          <span className="text-[10px] font-medium tracking-wide leading-none">
            Storefront
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenMore}
          aria-expanded={moreOpen}
          className={navButtonClass(isMoreActive)}
        >
          <Grid2X2 className="w-4 h-4 shrink-0" />
          <span className="text-[10px] font-medium tracking-wide leading-none">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
