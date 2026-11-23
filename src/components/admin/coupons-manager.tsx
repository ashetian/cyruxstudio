"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminBottomSheet } from "./admin-bottom-sheet";
import {
  Plus,
  Search,
  RotateCcw,
  X,
  AlertCircle,
  Trash2,
} from "lucide-react";

export interface CouponsManagerProps {
  currency?: string;
  onMutated?: () => void;
}

type CouponDiscountType = "percentage" | "fixed";
type CouponStatusFilter = "all" | "active" | "inactive";

interface LocalizedTitle {
  tr: string;
  en: string;
}

interface CouponRecord {
  id: string;
  code: string;
  title: LocalizedTitle | string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function resolveLocalizedTitle(title: unknown): {
  tr: string;
  en: string;
  display: string;
} {
  if (typeof title === "string") {
    return { tr: title, en: title, display: title };
  }
  if (title && typeof title === "object") {
    const record = title as Record<string, unknown>;
    const tr = typeof record.tr === "string" ? record.tr : "";
    const en = typeof record.en === "string" ? record.en : "";
    return { tr, en, display: en || tr || "" };
  }
  return { tr: "", en: "", display: "" };
}

function formatMoney(amount: number, currency: string = "EUR"): string {
  const code = currency.toUpperCase();
  const symbol =
    code === "EUR" ? "€" : code === "TRY" ? "₺" : code === "GBP" ? "£" : "$";
  return `${symbol}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CouponsManager({
  currency = "EUR",
  onMutated,
}: CouponsManagerProps) {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<CouponStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CouponDiscountType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleTr, setTitleTr] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCoupons = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter === "active") params.set("active", "true");
      if (statusFilter === "inactive") params.set("active", "false");
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());

      const res = await fetch(`/api/admin/coupons?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        coupons?: CouponRecord[];
        error?: string;
      };

      if (res.ok && data.success) {
        setCoupons(data.coupons || []);
      } else {
        setError(data.error || "Failed to load coupons");
      }
    } catch {
      setError("Network error loading coupons");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, debouncedQuery]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const toggleCouponActive = async (coupon: CouponRecord) => {
    const nextActive = !coupon.isActive;
    setTogglingId(coupon.id);
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, isActive: nextActive } : c))
    );

    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update coupon");
      }
      onMutated?.();
    } catch (err: unknown) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c))
      );
      setError(err instanceof Error ? err.message : "Failed to toggle coupon");
    } finally {
      setTogglingId(null);
    }
  };

  const openCreateSheet = () => {
    setEditingId(null);
    setCode("");
    setTitleEn("");
    setTitleTr("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderAmount("");
    setMaxUses("");
    setStartsAt("");
    setExpiresAt("");
    setIsActive(true);
    setFormError(null);
    setConfirmDelete(false);
    setSheetOpen(true);
  };

  const openEditSheet = (coupon: CouponRecord) => {
    const resolved = resolveLocalizedTitle(coupon.title);
    setEditingId(coupon.id);
    setCode(coupon.code);
    setTitleEn(resolved.en);
    setTitleTr(resolved.tr);
    setDiscountType(coupon.discountType);
    setDiscountValue(String(coupon.discountValue));
    setMinOrderAmount(
      coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : ""
    );
    setMaxUses(coupon.maxUses != null ? String(coupon.maxUses) : "");
    setStartsAt(coupon.startsAt ? String(coupon.startsAt).slice(0, 10) : "");
    setExpiresAt(coupon.expiresAt ? String(coupon.expiresAt).slice(0, 10) : "");
    setIsActive(coupon.isActive);
    setFormError(null);
    setConfirmDelete(false);
    setSheetOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,32}$/.test(normalizedCode)) {
      setFormError("Code must be 2-32 characters (A-Z, 0-9, _, -).");
      return;
    }

    const numVal = parseFloat(discountValue);
    if (isNaN(numVal) || numVal <= 0) {
      setFormError("Discount value must be greater than 0.");
      return;
    }
    if (discountType === "percentage" && numVal > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }

    const numMinOrder = minOrderAmount.trim() ? parseFloat(minOrderAmount) : null;
    if (numMinOrder !== null && (isNaN(numMinOrder) || numMinOrder < 0)) {
      setFormError("Minimum order amount must be 0 or higher.");
      return;
    }

    const numMaxUses = maxUses.trim() ? parseInt(maxUses, 10) : null;
    if (numMaxUses !== null && (isNaN(numMaxUses) || numMaxUses < 1)) {
      setFormError("Max uses must be 1 or higher.");
      return;
    }

    if (startsAt && expiresAt && startsAt > expiresAt) {
      setFormError("Start date must be before or equal to expiration date.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/admin/coupons/${editingId}`
        : "/api/admin/coupons";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalizedCode,
          title: {
            en: titleEn.trim() || titleTr.trim() || normalizedCode,
            tr: titleTr.trim() || titleEn.trim() || normalizedCode,
          },
          discountType,
          discountValue: numVal,
          minOrderAmount: numMinOrder,
          maxUses: numMaxUses,
          startsAt: startsAt ? new Date(`${startsAt}T00:00:00.000Z`).toISOString() : null,
          expiresAt: expiresAt
            ? new Date(`${expiresAt}T23:59:59.999Z`).toISOString()
            : null,
          isActive,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save coupon");
      }

      setSheetOpen(false);
      await fetchCoupons();
      onMutated?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!editingId) return;
    setDeleting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/coupons/${editingId}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete coupon");
      }
      setSheetOpen(false);
      await fetchCoupons();
      onMutated?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Toolbar */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#0A0A0A]">
              Coupons & Campaigns ({coupons.length})
            </h2>
            <p className="text-xs text-[#525252]">
              Manage promotional discount codes, thresholds, and usage caps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCoupons}
              aria-label="Refresh coupons"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={openCreateSheet}
              className="min-h-[44px] px-4 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <Plus className="w-4 h-4" />
              <span>New Coupon</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#E8E4DC]">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "active", "inactive"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[44px] px-3.5 text-xs font-medium uppercase tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  statusFilter === st
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                }`}
              >
                {st}
              </button>
            ))}

            <select
              aria-label="Filter by discount type"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | CouponDiscountType)
              }
              className="min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <option value="all">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupon code or title..."
              aria-label="Search coupons"
              className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs pl-9 pr-11 py-2.5 placeholder:text-[#737373]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 text-xs p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={fetchCoupons}
            className="min-h-[44px] px-4 bg-[#FFFFFF] border border-red-300 text-red-900 uppercase text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 h-40 flex flex-col justify-between"
            >
              <div className="h-4 w-1/3 bg-[#FAF8F3]" />
              <div className="h-12 w-full bg-[#FAF8F3]" />
            </div>
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-8 text-center flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-wider text-[#525252]">
            No coupons match the current filter.
          </p>
          <button
            type="button"
            onClick={openCreateSheet}
            className="min-h-[44px] px-4 bg-[#0A0A0A] text-[#FFFFFF] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            Create Coupon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coupons.map((coupon) => {
            const titleObj = resolveLocalizedTitle(coupon.title);
            const isExpired =
              Boolean(coupon.expiresAt) &&
              new Date(String(coupon.expiresAt)) < new Date();

            return (
              <div
                key={coupon.id}
                className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col gap-3 min-w-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-bold tracking-wider uppercase text-[#0A0A0A]">
                        {coupon.code}
                      </span>
                      {isExpired && (
                        <span className="px-2 py-0.5 text-[10px] font-medium uppercase bg-red-50 border border-red-300 text-red-900">
                          Expired
                        </span>
                      )}
                    </div>
                    {titleObj.display && (
                      <p className="text-xs text-[#525252] truncate mt-0.5">
                        {titleObj.display}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={coupon.isActive}
                    disabled={togglingId === coupon.id}
                    onClick={() => toggleCouponActive(coupon)}
                    className={`min-h-[44px] px-3 text-xs font-medium uppercase tracking-wider border shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                      coupon.isActive
                        ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                        : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC]"
                    }`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-[#737373] block">
                      Discount
                    </span>
                    <span className="font-mono font-semibold text-[#0A0A0A]">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% OFF`
                        : `${formatMoney(coupon.discountValue, currency)} OFF`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#737373] block">
                      Min Order
                    </span>
                    <span className="font-mono text-[#0A0A0A]">
                      {coupon.minOrderAmount != null
                        ? formatMoney(coupon.minOrderAmount, currency)
                        : "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#737373] block">
                      Usage
                    </span>
                    <span className="font-mono text-[#0A0A0A]">
                      {coupon.usedCount} / {coupon.maxUses ?? "Unlimited"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#737373] block">
                      Expires
                    </span>
                    <span className="font-mono text-[#0A0A0A]">
                      {coupon.expiresAt
                        ? new Date(coupon.expiresAt).toLocaleDateString()
                        : "No expiry"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditSheet(coupon)}
                    className="flex-1 min-h-[44px] border border-[#0A0A0A] bg-[#FFFFFF] hover:bg-[#0A0A0A] hover:text-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Edit Campaign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Coupon Bottom Sheet */}
      <AdminBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? `Edit ${code}` : "New Coupon"}
        subtitle="Configure discount value, minimum order, and schedule"
      >
        <form onSubmit={handleSaveCoupon} className="flex flex-col gap-4 text-xs">
          {formError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-300 text-red-900 p-3 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
              Coupon Code *
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={32}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
              }
              placeholder="ATELIER20"
              className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Campaign Title (EN)
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Atelier Welcome 20%"
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Campaign Title (TR)
              </label>
              <input
                type="text"
                value={titleTr}
                onChange={(e) => setTitleTr(e.target.value)}
                placeholder="Atölye Hoş Geldin %20"
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1.5">
              Discount Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType("percentage")}
                className={`min-h-[44px] border text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  discountType === "percentage"
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC]"
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("fixed")}
                className={`min-h-[44px] border text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  discountType === "fixed"
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC]"
                }`}
              >
                Fixed ({currency})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={discountType === "percentage" ? "100" : undefined}
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Min Order Amount
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="Optional"
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Max Uses
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Starts At
              </label>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Expires At
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <label className="min-h-[44px] flex items-center gap-3 px-3 py-2 bg-[#FAF8F3] border border-[#E8E4DC] cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#0A0A0A] cursor-pointer"
            />
            <span className="text-xs font-medium text-[#0A0A0A]">
              Coupon is active and redeemable
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E4DC]">
            {editingId && (
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteCoupon}
                      disabled={deleting}
                      className="min-h-[44px] px-3 bg-red-700 text-[#FFFFFF] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      {deleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="min-h-[44px] px-3 bg-red-50 border border-red-300 text-red-800 text-xs font-medium uppercase inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="min-h-[44px] px-4 border border-[#E8E4DC] bg-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-5 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Coupon"}
              </button>
            </div>
          </div>
        </form>
      </AdminBottomSheet>
    </div>
  );
}
