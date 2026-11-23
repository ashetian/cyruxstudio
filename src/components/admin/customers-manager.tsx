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
  Edit3,
} from "lucide-react";

export interface CustomersManagerProps {
  currency?: string;
  onMutated?: () => void;
  onFilterOrdersByCustomer?: (customerId: string) => void;
}

interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  _count?: { orders: number };
  createdAt: string;
  updatedAt: string;
}

interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  trackingNumber: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    lineTotal: number;
  }>;
}

interface CustomerDetailRecord extends CustomerListItem {
  orders: CustomerOrderSummary[];
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

export function CustomersManager({
  currency = "EUR",
  onMutated,
  onFilterOrdersByCustomer,
}: CustomersManagerProps) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "spent_desc" | "orders_desc" | "name_asc">(
    "newest"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail sheet
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create / Edit form sheet
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        customers?: CustomerListItem[];
        error?: string;
      };

      if (res.ok && data.success) {
        setCustomers(data.customers || []);
      } else {
        setError(data.error || "Failed to load customers");
      }
    } catch {
      setError("Network error loading customers");
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, debouncedQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openDetail = async (customer: CustomerListItem) => {
    setDetailCustomer({ ...customer, orders: [] });
    setDetailLoading(true);
    setDetailError(null);
    setConfirmDelete(false);

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`);
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        customer?: CustomerDetailRecord;
        error?: string;
      };
      if (res.ok && data.success && data.customer) {
        setDetailCustomer(data.customer);
      } else {
        setDetailError(data.error || "Failed to load customer history");
      }
    } catch {
      setDetailError("Network error loading customer details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setEmail("");
    setCity("");
    setAddress("");
    setNotes("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (cust: CustomerListItem) => {
    setEditingId(cust.id);
    setName(cust.name || "");
    setPhone(cust.phone || "");
    setEmail(cust.email || "");
    setCity(cust.city || "");
    setAddress(cust.address || "");
    setNotes(cust.notes || "");
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Customer name is required.");
      return;
    }
    if (phone.trim().length < 5) {
      setFormError("Phone number must be at least 5 characters.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/admin/customers/${editingId}`
        : "/api/admin/customers";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        customer?: CustomerListItem;
        error?: string;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save customer");
      }

      setFormOpen(false);
      await fetchCustomers();
      if (detailCustomer && editingId === detailCustomer.id && data.customer) {
        setDetailCustomer({ ...detailCustomer, ...data.customer });
      }
      onMutated?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!detailCustomer) return;
    setDeleting(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/customers/${detailCustomer.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete customer");
      }
      setDetailCustomer(null);
      await fetchCustomers();
      onMutated?.();
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Failed to delete customer");
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
              Customers ({customers.length})
            </h2>
            <p className="text-xs text-[#525252]">
              Client directory, lifetime spend, and order history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCustomers}
              aria-label="Refresh customers"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="min-h-[44px] px-4 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-[#E8E4DC]">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers by name, phone, email, or city..."
              aria-label="Search customers"
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
            aria-label="Sort customers"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <option value="newest">Newest</option>
            <option value="spent_desc">Highest Spent</option>
            <option value="orders_desc">Most Orders</option>
            <option value="name_asc">Name A-Z</option>
          </select>
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
            onClick={fetchCustomers}
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
              <div className="h-4 w-1/2 bg-[#FAF8F3]" />
              <div className="h-8 w-full bg-[#FAF8F3]" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-8 text-center flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-wider text-[#525252]">
            No customers match your search.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="min-h-[44px] px-4 bg-[#0A0A0A] text-[#FFFFFF] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            Add First Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {customers.map((customer) => {
            const orderCount = customer._count?.orders ?? customer.totalOrders;
            const phoneDigits = customer.phone.replace(/\D/g, "");

            return (
              <div
                key={customer.id}
                className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col gap-3 min-w-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#0A0A0A] truncate">
                      {customer.name}
                    </h3>
                    <p className="font-mono text-xs text-[#525252] truncate mt-0.5">
                      {customer.phone}
                    </p>
                    {customer.email && (
                      <p className="text-xs text-[#737373] truncate">{customer.email}</p>
                    )}
                  </div>
                  {customer.city && (
                    <span className="px-2 py-0.5 bg-[#FAF8F3] border border-[#E8E4DC] text-xs text-[#0A0A0A] shrink-0">
                      {customer.city}
                    </span>
                  )}
                </div>

                <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-2.5 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase text-[#737373] block">
                      Orders
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#0A0A0A]">
                      {orderCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#737373] block">
                      Total Spent
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#0A0A0A]">
                      {formatMoney(customer.totalSpent, currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(customer)}
                    className="flex-1 min-h-[44px] border border-[#0A0A0A] bg-[#FFFFFF] hover:bg-[#0A0A0A] hover:text-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    View History
                  </button>
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Message ${customer.name} on WhatsApp`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail & Past Orders Bottom Sheet */}
      <AdminBottomSheet
        isOpen={Boolean(detailCustomer)}
        onClose={() => setDetailCustomer(null)}
        title={detailCustomer?.name || "Customer Profile"}
        subtitle={detailCustomer?.phone}
      >
        {detailCustomer && (
          <div className="flex flex-col gap-4 text-xs">
            {detailError && (
              <div
                role="alert"
                className="bg-red-50 border border-red-300 text-red-900 p-3 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{detailError}</span>
              </div>
            )}

            <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-3.5 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#0A0A0A]">
                  {detailCustomer.phone}
                </span>
                {detailCustomer.city && (
                  <span className="text-xs text-[#525252]">{detailCustomer.city}</span>
                )}
              </div>
              {detailCustomer.email && (
                <p className="text-xs text-[#525252]">{detailCustomer.email}</p>
              )}
              {detailCustomer.address && (
                <p className="text-xs text-[#525252]">{detailCustomer.address}</p>
              )}
              {detailCustomer.notes && (
                <p className="text-xs text-[#0A0A0A] italic">{detailCustomer.notes}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => openEditForm(detailCustomer)}
                  className="min-h-[44px] px-3.5 bg-[#0A0A0A] text-[#FFFFFF] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                {onFilterOrdersByCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      const cid = detailCustomer.id;
                      setDetailCustomer(null);
                      onFilterOrdersByCustomer(cid);
                    }}
                    className="min-h-[44px] px-3.5 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Filter in Orders Tab
                  </button>
                )}
              </div>
            </div>

            {/* Past Orders */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[11px] font-semibold uppercase text-[#525252]">
                Past Orders ({detailCustomer.orders.length})
              </h4>
              {detailLoading ? (
                <p className="text-xs text-[#525252] py-3">Loading order history...</p>
              ) : detailCustomer.orders.length === 0 ? (
                <p className="text-xs text-[#525252] py-3 border border-[#E8E4DC] p-3 bg-[#FAF8F3]">
                  No orders recorded for this client yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {detailCustomer.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-[#FFFFFF] border border-[#E8E4DC] p-3 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-[#0A0A0A]">
                          {ord.orderNumber}
                        </span>
                        <span className="uppercase text-[10px] px-2 py-0.5 border border-[#E8E4DC] bg-[#FAF8F3]">
                          {ord.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#525252]">
                        <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                        <span className="font-mono font-semibold text-[#0A0A0A]">
                          {formatMoney(ord.total, ord.currency)}
                        </span>
                      </div>
                      {ord.items.length > 0 && (
                        <p className="text-[11px] text-[#737373] truncate">
                          {ord.items
                            .map((i) => `${i.productName} ×${i.quantity}`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Customer */}
            <div className="pt-3 border-t border-[#E8E4DC] flex flex-wrap items-center justify-between gap-2">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteCustomer}
                    disabled={deleting}
                    className="min-h-[44px] px-4 bg-red-700 text-[#FFFFFF] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[44px] px-4 border border-[#E8E4DC] bg-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[44px] px-3.5 bg-red-50 border border-red-300 text-red-800 text-xs font-medium uppercase inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Customer</span>
                </button>
              )}
            </div>
          </div>
        )}
      </AdminBottomSheet>

      {/* Create / Edit Customer Bottom Sheet */}
      <AdminBottomSheet
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Edit Customer" : "Add Customer"}
        subtitle="Client contact and atelier notes"
      >
        <form onSubmit={handleSaveCustomer} className="flex flex-col gap-4 text-xs">
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
              Name *
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Phone *
              </label>
              <input
                type="tel"
                required
                minLength={5}
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+905331234567"
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
              City
            </label>
            <input
              type="text"
              maxLength={100}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
              Address
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-[#525252] mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E4DC]">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-[44px] px-4 border border-[#E8E4DC] bg-[#FFFFFF] text-[#0A0A0A] text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </form>
      </AdminBottomSheet>
    </div>
  );
}
