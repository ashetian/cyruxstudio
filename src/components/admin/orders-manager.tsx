"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminBottomSheet } from "./admin-bottom-sheet";
import {
  Plus,
  Search,
  RotateCcw,
  X,
  AlertCircle,
  ExternalLink,
  Trash2,
  User,
} from "lucide-react";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderStatusFilter = "all" | OrderStatus;

export interface OrdersManagerProps {
  currency?: string;
  initialStatusFilter?: OrderStatusFilter;
  initialCustomerId?: string | null;
  onClearCustomerFilter?: () => void;
  onMutated?: () => void;
  onNavigateToCustomer?: (customerId: string) => void;
}

interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderCustomerRef {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customer?: OrderCustomerRef | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string | null;
  status: OrderStatus;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  whatsappUrl: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  items: OrderItemRecord[];
  createdAt: string;
  updatedAt: string;
}

interface OrderSummaryCounts {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  variants: Array<{ name?: string; size?: string }>;
}

interface ManualOrderLine {
  productId: string;
  variantName: string;
  quantity: number;
}

const ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

function formatMoney(amount: number, currency: string = "EUR"): string {
  const code = currency.toUpperCase();
  const symbol =
    code === "EUR" ? "€" : code === "TRY" ? "₺" : code === "GBP" ? "£" : "$";
  return `${symbol}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case "confirmed":
      return "bg-[#F3EFE6] text-[#0A0A0A] border-[#D4CBB8]";
    case "preparing":
      return "bg-amber-50 text-amber-900 border-amber-300";
    case "shipped":
      return "bg-sky-50 text-sky-900 border-sky-300";
    case "delivered":
      return "bg-emerald-50 text-emerald-900 border-emerald-300";
    case "cancelled":
      return "bg-red-50 text-red-900 border-red-300";
    default:
      return "bg-[#FAF8F3] text-[#0A0A0A] border-[#0A0A0A]/30";
  }
}

export function OrdersManager({
  currency = "EUR",
  initialStatusFilter = "all",
  initialCustomerId = null,
  onClearCustomerFilter,
  onMutated,
  onNavigateToCustomer,
}: OrdersManagerProps) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [summary, setSummary] = useState<OrderSummaryCounts>({
    total: 0,
    pending: 0,
    confirmed: 0,
    preparing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(initialStatusFilter);
  const [customerIdFilter, setCustomerIdFilter] = useState<string | null>(initialCustomerId);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "total_desc" | "total_asc">(
    "newest"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected order sheet state
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>("pending");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);

  // Manual order creation sheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newShippingAddress, setNewShippingAddress] = useState("");
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [newAdminNotes, setNewAdminNotes] = useState("");
  const [lineItems, setLineItems] = useState<ManualOrderLine[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setCustomerIdFilter(initialCustomerId ?? null);
  }, [initialCustomerId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("sort", sortBy);
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (customerIdFilter) params.set("customerId", customerIdFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        orders?: OrderRecord[];
        summary?: OrderSummaryCounts;
        error?: string;
      };

      if (res.ok && data.success) {
        setOrders(data.orders || []);
        if (data.summary) setSummary(data.summary);
      } else {
        setError(data.error || "Failed to load orders");
      }
    } catch {
      setError("Network error loading orders");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, sortBy, debouncedQuery, customerIdFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openOrderDetail = (order: OrderRecord) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setTrackingCarrier(order.trackingCarrier || "");
    setTrackingNumber(order.trackingNumber || "");
    setShippingAddress(order.shippingAddress || "");
    setAdminNotes(order.adminNotes || "");
    setSaveError(null);
    setConfirmDelete(false);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingOrder(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          trackingCarrier: trackingCarrier.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          shippingAddress: shippingAddress.trim() || null,
          adminNotes: adminNotes.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update order");
      }

      setSelectedOrder(null);
      await fetchOrders();
      onMutated?.();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    setDeletingOrder(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete order");
      }
      setSelectedOrder(null);
      await fetchOrders();
      onMutated?.();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete order");
    } finally {
      setDeletingOrder(false);
    }
  };

  const openCreateSheet = async () => {
    setCreateError(null);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setNewShippingAddress("");
    setNewStatus("pending");
    setNewCouponCode("");
    setNewCustomerNotes("");
    setNewAdminNotes("");
    setCreateOpen(true);

    try {
      const res = await fetch("/api/admin/products?limit=100");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        products?: ProductOption[];
      };
      if (res.ok && data.success && Array.isArray(data.products)) {
        setProductOptions(data.products);
        if (data.products.length > 0) {
          setLineItems([{ productId: data.products[0].id, variantName: "", quantity: 1 }]);
        } else {
          setLineItems([]);
        }
      }
    } catch {
      setLineItems([]);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setCreateError("Customer name and phone are required.");
      return;
    }
    if (lineItems.length === 0 || lineItems.some((l) => !l.productId || l.quantity < 1)) {
      setCreateError("Add at least one valid product item.");
      return;
    }

    setCreatingOrder(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newCustomerName.trim(),
          customerPhone: newCustomerPhone.trim(),
          customerEmail: newCustomerEmail.trim() || "",
          shippingAddress: newShippingAddress.trim() || undefined,
          status: newStatus,
          couponCode: newCouponCode.trim().toUpperCase() || undefined,
          customerNotes: newCustomerNotes.trim() || undefined,
          adminNotes: newAdminNotes.trim() || undefined,
          items: lineItems.map((l) => ({
            productId: l.productId,
            variantName: l.variantName.trim() || undefined,
            quantity: l.quantity,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      setCreateOpen(false);
      await fetchOrders();
      onMutated?.();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const getEstimatedManualTotal = () => {
    return lineItems.reduce((sum, item) => {
      const prod = productOptions.find((p) => p.id === item.productId);
      if (!prod) return sum;
      const unit =
        prod.discountPrice != null && prod.discountPrice < prod.price
          ? prod.discountPrice
          : prod.price;
      return sum + unit * item.quantity;
    }, 0);
  };

  return (
    <div className="flex flex-col gap-5 bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Header Row */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#0A0A0A]">
              Orders ({summary.total})
            </h2>
            <p className="text-xs text-[#525252]">
              Track fulfillment, shipping carriers, and WhatsApp inquiries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOrders}
              aria-label="Refresh orders"
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
              <span>New Order</span>
            </button>
          </div>
        </div>

        {customerIdFilter && (
          <div className="flex items-center justify-between gap-2 bg-[#FAF8F3] border border-[#E8E4DC] px-3 py-2 text-xs">
            <span>Filtered by customer profile</span>
            <button
              type="button"
              onClick={() => {
                setCustomerIdFilter(null);
                onClearCustomerFilter?.();
              }}
              className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FFFFFF] text-[#0A0A0A] uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-[#E8E4DC]">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, phone, or tracking..."
              aria-label="Search orders"
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

          <select
            aria-label="Sort orders"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="total_desc">Total: High to Low</option>
            <option value="total_asc">Total: Low to High</option>
          </select>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full [scrollbar-width:none]">
          {(["all", ...ORDER_STATUSES] as const).map((st) => {
            const active = statusFilter === st;
            const count =
              st === "all" ? summary.total : summary[st];
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-medium uppercase tracking-wider border whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  active
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading / Error / Empty / Cards */}
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
            onClick={fetchOrders}
            className="min-h-[44px] px-4 bg-[#FFFFFF] border border-red-300 text-red-900 uppercase text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 h-36 flex flex-col justify-between"
            >
              <div className="h-4 w-1/3 bg-[#FAF8F3]" />
              <div className="h-4 w-2/3 bg-[#FAF8F3]" />
              <div className="h-4 w-1/2 bg-[#FAF8F3]" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-8 text-center flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-wider text-[#525252]">
            No orders match the current filter.
          </p>
          {(statusFilter !== "all" || searchQuery || customerIdFilter) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
                setCustomerIdFilter(null);
                onClearCustomerFilter?.();
              }}
              className="min-h-[44px] px-4 border border-[#E8E4DC] bg-[#FAF8F3] text-xs font-medium uppercase text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orders.map((order) => {
            const itemSummary = order.items
              .map((it) => `${it.productName}${it.variantName ? ` (${it.variantName})` : ""} x${it.quantity}`)
              .join(", ");

            return (
              <div
                key={order.id}
                className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col gap-3 min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-[#0A0A0A]">
                      {order.orderNumber}
                    </span>
                    <span className="text-[11px] text-[#737373] ml-2">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium uppercase border shrink-0 ${getStatusBadgeClass(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">
                    {order.customerName}
                  </p>
                  <p className="text-xs font-mono text-[#525252] truncate">
                    {order.customerPhone}
                  </p>
                </div>

                <p className="text-xs text-[#525252] line-clamp-1">
                  {order.items.length} {order.items.length === 1 ? "item" : "items"} •{" "}
                  {itemSummary || "Manual order"}
                </p>

                {(order.trackingNumber || order.couponCode) && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#525252]">
                    {order.trackingNumber && (
                      <span className="px-2 py-0.5 bg-[#FAF8F3] border border-[#E8E4DC]">
                        {order.trackingCarrier ? `${order.trackingCarrier} • ` : ""}
                        {order.trackingNumber}
                      </span>
                    )}
                    {order.couponCode && (
                      <span className="px-2 py-0.5 bg-[#FAF8F3] border border-[#E8E4DC]">
                        Coupon: {order.couponCode}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-[#E8E4DC] flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-semibold text-[#0A0A0A]">
                    {formatMoney(order.total, order.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openOrderDetail(order)}
                    className="min-h-[44px] px-4 border border-[#0A0A0A] bg-[#FFFFFF] hover:bg-[#0A0A0A] hover:text-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Manage
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail & Edit Bottom Sheet */}
      <AdminBottomSheet
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : "Order"}
        subtitle={
          selectedOrder
            ? `${selectedOrder.customerName} • ${new Date(
                selectedOrder.createdAt
              ).toLocaleString()}`
            : undefined
        }
      >
        {selectedOrder && (
          <form onSubmit={handleSaveOrder} className="flex flex-col gap-4 text-xs">
            {saveError && (
              <div
                role="alert"
                className="bg-red-50 border border-red-300 text-red-900 p-3 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Contact & Quick Links */}
            <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-3.5 flex flex-col gap-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-sm text-[#0A0A0A]">
                  {selectedOrder.customerName}
                </span>
                <span className="font-mono text-xs text-[#525252]">
                  {selectedOrder.customerPhone}
                  {selectedOrder.customerEmail ? ` • ${selectedOrder.customerEmail}` : ""}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={
                    selectedOrder.whatsappUrl ||
                    `https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 border border-[#0A0A0A] bg-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <span>WhatsApp Client</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {selectedOrder.customerId && onNavigateToCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      const cid = selectedOrder.customerId;
                      setSelectedOrder(null);
                      if (cid) onNavigateToCustomer(cid);
                    }}
                    className="min-h-[44px] px-3.5 border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>View Customer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase text-[#525252]">
                Items
              </span>
              <div className="divide-y divide-[#E8E4DC]">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#0A0A0A] truncate">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-[#525252] font-mono">
                        {item.variantName ? `${item.variantName} • ` : ""}
                        {item.quantity} × {formatMoney(item.unitPrice, selectedOrder.currency)}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-[#0A0A0A] shrink-0">
                      {formatMoney(item.lineTotal, selectedOrder.currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#E8E4DC] flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between text-[#525252]">
                  <span>Subtotal</span>
                  <span>{formatMoney(selectedOrder.subtotal, selectedOrder.currency)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>
                      Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ""}
                    </span>
                    <span>-{formatMoney(selectedOrder.discountAmount, selectedOrder.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#525252]">
                  <span>Shipping</span>
                  <span>{formatMoney(selectedOrder.shippingFee, selectedOrder.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm text-[#0A0A0A] pt-1 border-t border-[#E8E4DC]">
                  <span>Total</span>
                  <span>{formatMoney(selectedOrder.total, selectedOrder.currency)}</span>
                </div>
              </div>
              {selectedOrder.customerNotes && (
                <div className="mt-2 p-2.5 bg-[#FAF8F3] border border-[#E8E4DC] text-xs text-[#525252]">
                  Client note: {selectedOrder.customerNotes}
                </div>
              )}
            </div>

            {/* Fulfillment Controls */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1.5">
                  Order Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ORDER_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`min-h-[44px] px-3 text-xs font-medium uppercase border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                        editStatus === st
                          ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                          : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                    Carrier
                  </label>
                  <input
                    type="text"
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    placeholder="DHL, FedEx, Yurtiçi Kargo"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="TRK-000000"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                  Shipping Address
                </label>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[72px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                  Admin Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal fulfillment notes..."
                  className="w-full bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[88px]"
                />
              </div>
            </div>

            {/* Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E4DC]">
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteOrder}
                      disabled={deletingOrder}
                      className="min-h-[44px] px-3 bg-red-700 text-[#FFFFFF] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      {deletingOrder ? "Deleting..." : "Confirm Delete"}
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
                    <span>Delete Order</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={savingOrder}
                className="min-h-[44px] px-5 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider disabled:opacity-50 cursor-pointer ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                {savingOrder ? "Saving..." : "Save Order Changes"}
              </button>
            </div>
          </form>
        )}
      </AdminBottomSheet>

      {/* Manual Order Creation Sheet */}
      <AdminBottomSheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Manual Order"
        subtitle="Record a bespoke or direct client order"
      >
        <form onSubmit={handleCreateOrder} className="flex flex-col gap-4 text-xs">
          {createError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-300 text-red-900 p-3 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="+905331234567"
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Email
              </label>
              <input
                type="email"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Initial Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
              Shipping Address
            </label>
            <textarea
              rows={2}
              value={newShippingAddress}
              onChange={(e) => setNewShippingAddress(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            />
          </div>

          {/* Line Items */}
          <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase text-[#525252]">
                Order Items
              </span>
              <button
                type="button"
                onClick={() =>
                  setLineItems([
                    ...lineItems,
                    {
                      productId: productOptions[0]?.id || "",
                      variantName: "",
                      quantity: 1,
                    },
                  ])
                }
                className="min-h-[44px] px-3 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                Add Item
              </button>
            </div>

            {lineItems.map((line, idx) => (
              <div
                key={idx}
                className="bg-[#FFFFFF] border border-[#E8E4DC] p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
              >
                <select
                  value={line.productId}
                  onChange={(e) => {
                    const next = [...lineItems];
                    next[idx] = { ...next[idx], productId: e.target.value };
                    setLineItems(next);
                  }}
                  aria-label={`Select product for item ${idx + 1}`}
                  className="sm:col-span-6 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-2.5 py-2 cursor-pointer"
                >
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={line.variantName}
                  onChange={(e) => {
                    const next = [...lineItems];
                    next[idx] = { ...next[idx], variantName: e.target.value };
                    setLineItems(next);
                  }}
                  placeholder="Size / Variant"
                  aria-label={`Variant for item ${idx + 1}`}
                  className="sm:col-span-3 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-2.5 py-2"
                />
                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = {
                        ...next[idx],
                        quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                      };
                      setLineItems(next);
                    }}
                    aria-label={`Quantity for item ${idx + 1}`}
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-2.5 py-2 font-mono"
                  />
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setLineItems(lineItems.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove item"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] hover:border-red-400 text-red-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="text-right font-mono font-semibold text-xs text-[#0A0A0A]">
              Estimated Subtotal: {formatMoney(getEstimatedManualTotal(), currency)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Coupon Code
              </label>
              <input
                type="text"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="Optional"
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Client Notes
              </label>
              <input
                type="text"
                value={newCustomerNotes}
                onChange={(e) => setNewCustomerNotes(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
              Admin Notes
            </label>
            <textarea
              rows={2}
              value={newAdminNotes}
              onChange={(e) => setNewAdminNotes(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[72px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E4DC]">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="min-h-[44px] px-4 border border-[#E8E4DC] bg-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingOrder}
              className="min-h-[44px] px-5 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              {creatingOrder ? "Creating..." : "Create Order"}
            </button>
          </div>
        </form>
      </AdminBottomSheet>
    </div>
  );
}
