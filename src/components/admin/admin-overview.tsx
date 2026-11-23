"use client";

import React from "react";
import {
  RotateCcw,
  Package,
  ShoppingBag,
  LayoutTemplate,
  Tag,
  AlertTriangle,
  ArrowRight,
  Layers,
  Users,
} from "lucide-react";
import type { AdminTab } from "./admin-header";

export interface AdminOverviewStats {
  activeGarmentCount: number;
  totalStock: number;
  inventoryValuation: number;
  bestsellerCount: number;
  depletedCount: number;
  lowStockCount: number;
  lowStockThreshold: number;
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
  credits: { used: number; remaining: number; cap: number; percentage: number };
  totalAiAssets: number;
  currency: string;
  whatsappNumber: string;
  dbStatus: string;
  totalOrders: number;
  pendingOrders: number;
  ordersByStatus: Record<
    "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled",
    number
  >;
  totalRevenue: number;
  totalCustomers: number;
  totalCollections: number;
  activeCoupons: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    slug: string;
    stock: number;
    price: number;
    discountPrice: number | null;
    mediaUrls: string[];
    badge: string | null;
    category: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    itemCount: number;
  }>;
}

export interface AdminOverviewProps {
  stats: AdminOverviewStats | null;
  loading: boolean;
  error?: string | null;
  currencySymbol: string;
  onNavigate: (tab: AdminTab) => void;
  onEditProduct?: (productId: string) => void;
  onRefresh: () => void;
}

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatOrderCurrency(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const sym =
    code === "EUR" ? "€" : code === "TRY" ? "₺" : code === "GBP" ? "£" : "$";
  return `${sym}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AdminOverview({
  stats,
  loading,
  error,
  currencySymbol,
  onNavigate,
  onEditProduct,
  onRefresh,
}: AdminOverviewProps) {
  const isInitialLoading = !stats && loading;
  const isInitialError = !stats && !loading && Boolean(error);

  return (
    <div className="flex flex-col gap-6 bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Top Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#525252] mt-0.5">
            Live atelier inventory, order activity, and quick controls.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="min-h-[44px] px-4 border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-xs sm:text-sm font-medium">{error}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="min-h-[44px] px-3.5 border border-red-300 bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col justify-between gap-2 min-w-0">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#525252]">
            Total Revenue
          </span>
          <span className="text-xl sm:text-2xl font-mono font-semibold text-[#0A0A0A] truncate">
            {isInitialLoading || isInitialError
              ? "—"
              : formatCurrency(stats?.totalRevenue ?? 0, currencySymbol)}
          </span>
          <span className="text-xs text-[#525252]">
            {isInitialLoading
              ? "Loading orders..."
              : isInitialError
              ? "Unavailable"
              : `${stats?.totalOrders ?? 0} total orders`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("orders")}
          className="min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] p-4 flex flex-col justify-between gap-2 text-left min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#525252]">
            Pending Orders
          </span>
          <span className="text-xl sm:text-2xl font-mono font-semibold text-[#0A0A0A]">
            {isInitialLoading || isInitialError ? "—" : stats?.pendingOrders ?? 0}
          </span>
          <span className="text-xs text-[#525252]">
            {isInitialLoading
              ? "Loading status..."
              : isInitialError
              ? "Unavailable"
              : `${stats?.ordersByStatus?.shipped ?? 0} shipped`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("products")}
          className="min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] p-4 flex flex-col justify-between gap-2 text-left min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#525252]">
            Inventory Value
          </span>
          <span className="text-xl sm:text-2xl font-mono font-semibold text-[#0A0A0A] truncate">
            {isInitialLoading || isInitialError
              ? "—"
              : formatCurrency(stats?.inventoryValuation ?? 0, currencySymbol)}
          </span>
          <span className="text-xs text-[#525252]">
            {isInitialLoading
              ? "Loading catalog..."
              : isInitialError
              ? "Unavailable"
              : `${stats?.activeGarmentCount ?? 0} pieces, ${stats?.totalStock ?? 0} units`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("coupons")}
          className="min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] p-4 flex flex-col justify-between gap-2 text-left min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#525252]">
            Active Campaigns
          </span>
          <span className="text-xl sm:text-2xl font-mono font-semibold text-[#0A0A0A]">
            {isInitialLoading || isInitialError ? "—" : stats?.activeCoupons ?? 0}
          </span>
          <span className="text-xs text-[#525252]">
            {isInitialLoading
              ? "Loading campaigns..."
              : isInitialError
              ? "Unavailable"
              : `${stats?.totalCollections ?? 0} collections, ${stats?.totalCustomers ?? 0} clients`}
          </span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { tab: "products" as AdminTab, label: "Products", icon: Package },
            { tab: "orders" as AdminTab, label: "Orders", icon: ShoppingBag },
            { tab: "cms" as AdminTab, label: "Storefront CMS", icon: LayoutTemplate },
            { tab: "coupons" as AdminTab, label: "Coupons", icon: Tag },
            { tab: "collections" as AdminTab, label: "Collections", icon: Layers },
            { tab: "customers" as AdminTab, label: "Customers", icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="min-h-[48px] bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] px-3.5 py-3 text-xs font-medium uppercase tracking-wider text-[#0A0A0A] flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-[#525252]" />
                  <span className="truncate">{item.label}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#737373]" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Column Operational Feeds: Low Stock Alerts & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <section className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E8E4DC]">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <h2 className="text-sm font-semibold text-[#0A0A0A] truncate">
                Low Stock Alerts
              </h2>
            </div>
            <span className="text-xs font-mono text-[#525252] shrink-0">
              {stats ? `${stats.lowStockProducts.length} items` : "—"}
            </span>
          </div>

          {isInitialLoading ? (
            <p className="text-xs text-[#525252] py-4">
              Loading inventory alerts...
            </p>
          ) : isInitialError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="text-xs text-red-900">
                Unable to load inventory alerts.
              </p>
              <button
                type="button"
                onClick={onRefresh}
                className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                Retry
              </button>
            </div>
          ) : !stats || stats.lowStockProducts.length === 0 ? (
            <p className="text-xs text-[#525252] py-4">
              All garments are above the low-stock threshold ({stats?.lowStockThreshold ?? 3}).
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-[#E8E4DC]">
              {stats.lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 shrink-0 bg-[#FAF8F3] border border-[#E8E4DC] overflow-hidden flex items-center justify-center">
                      {prod.mediaUrls?.[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={prod.mediaUrls[0]}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-[#737373]">
                          CYRUX
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[#0A0A0A] truncate">
                        {prod.name}
                      </p>
                      <p className="text-xs text-[#525252] font-mono mt-0.5">
                        {prod.stock <= 0 ? (
                          <span className="text-red-800 font-semibold">Out of stock</span>
                        ) : (
                          <span>{prod.stock} left</span>
                        )}
                        <span className="mx-1.5 text-[#D4CFC4]">•</span>
                        <span className="uppercase">{prod.category}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onEditProduct
                        ? onEditProduct(prod.id)
                        : onNavigate("products")
                    }
                    className="min-h-[44px] min-w-[44px] px-3 border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E8E4DC]">
            <h2 className="text-sm font-semibold text-[#0A0A0A]">
              Recent Orders
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              View All
            </button>
          </div>

          {isInitialLoading ? (
            <p className="text-xs text-[#525252] py-4">
              Loading recent orders...
            </p>
          ) : isInitialError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="text-xs text-red-900">
                Unable to load recent orders.
              </p>
              <button
                type="button"
                onClick={onRefresh}
                className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                Retry
              </button>
            </div>
          ) : !stats || stats.recentOrders.length === 0 ? (
            <p className="text-xs text-[#525252] py-4">No orders recorded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#E8E4DC]">
              {stats.recentOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => onNavigate("orders")}
                  className="min-h-[48px] w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F3]/70 px-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#0A0A0A]">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] uppercase px-2 py-0.5 border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A]">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#525252] truncate mt-0.5">
                      {order.customerName} • {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <span className="font-mono text-xs sm:text-sm font-semibold text-[#0A0A0A] shrink-0">
                    {formatOrderCurrency(order.total, order.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
