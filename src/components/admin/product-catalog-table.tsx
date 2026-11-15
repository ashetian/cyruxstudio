"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { NewProductModal } from "./new-product-modal";
import { AiStudioModal } from "./ai-studio-modal";
import {
  Star,
  Plus,
  Minus,
  Trash2,
  Edit3,
  ExternalLink,
  X,
  MoreVertical,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Filter,
  Check,
  AlertCircle,
} from "lucide-react";

export interface ProductItem {
  id: string;
  name: string;
  title?: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  variants: Array<{ size?: string; stock?: number; id?: string; name?: string; inStock?: boolean }>;
  mediaUrls: string[];
  images?: string[];
  isBestseller: boolean;
  badge: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCatalogTableProps {
  currency?: string;
  onOpenAiStudio?: (productId?: string) => void;
  onMutated?: () => void;
}

const CATEGORIES = [
  { id: "all", label: "ALL CATEGORIES" },
  { id: "outerwear", label: "OUTERWEAR" },
  { id: "tops", label: "TOPS & HOODIES" },
  { id: "bottoms", label: "PANTS & CARGO" },
  { id: "tailoring", label: "TAILORING" },
  { id: "footwear", label: "FOOTWEAR" },
  { id: "accessories", label: "ACCESSORIES" },
  { id: "leather", label: "LEATHER GOODS" },
];

export function ProductCatalogTable({
  currency = "USD",
  onOpenAiStudio,
  onMutated,
}: ProductCatalogTableProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "depleted">("all");
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price_desc" | "price_asc" | "stock_desc" | "stock_asc" | "name_asc">("newest");

  // Inline Stock Edit State
  const [inlineEditingStockId, setInlineEditingStockId] = useState<string | null>(null);
  const [inlineStockValue, setInlineStockValue] = useState<string>("");
  const cancelInlineEditRef = useRef(false);

  // Modals & Action Sheet
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [selectedProductForAction, setSelectedProductForAction] = useState<ProductItem | null>(null);
  const [aiModalProduct, setAiModalProduct] = useState<ProductItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/products?limit=100");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProducts(data.products || []);
      } else {
        setError(data.error || "Failed to fetch catalog");
      }
    } catch {
      setError("Network error fetching catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Keyboard Shortcuts: '/' focuses search, 'N' opens new product modal, 'R' refreshes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditingProduct(null);
        setModalOpen(true);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        fetchProducts();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchProducts]);

  const toggleBestseller = async (prod: ProductItem) => {
    const nextState = !prod.isBestseller;
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === prod.id
          ? { ...p, isBestseller: nextState, badge: nextState ? "BESTSELLER" : null }
          : p
      )
    );
    if (selectedProductForAction && selectedProductForAction.id === prod.id) {
      setSelectedProductForAction({
        ...selectedProductForAction,
        isBestseller: nextState,
      });
    }

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBestseller: nextState }),
      });
      if (res.ok) {
        showToast(`[UPDATED] ${prod.name} ${nextState ? "PROMOTED TO BESTSELLER" : "BESTSELLER REMOVED"}`);
        onMutated?.();
      } else {
        fetchProducts();
      }
    } catch {
      fetchProducts();
    }
  };

  const updateStock = async (prod: ProductItem, delta: number) => {
    let nextStock = 0;
    setProducts((prev) => {
      const current = prev.find((p) => p.id === prod.id);
      const currentStock = current ? current.stock : prod.stock;
      nextStock = Math.max(0, currentStock + delta);
      return prev.map((p) => (p.id === prod.id ? { ...p, stock: nextStock } : p));
    });

    if (selectedProductForAction && selectedProductForAction.id === prod.id) {
      setSelectedProductForAction((prev) =>
        prev ? { ...prev, stock: Math.max(0, prev.stock + delta) } : null
      );
    }

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: nextStock }),
      });
      if (res.ok) {
        showToast(`[STOCK] ${prod.name} set to ${nextStock} units`);
        onMutated?.();
      } else {
        fetchProducts();
      }
    } catch {
      fetchProducts();
    }
  };

  const handleSaveInlineStock = async (prod: ProductItem) => {
    if (cancelInlineEditRef.current) {
      cancelInlineEditRef.current = false;
      return;
    }

    const num = parseInt(inlineStockValue, 10);
    if (isNaN(num) || num < 0) {
      setInlineEditingStockId(null);
      return;
    }

    setInlineEditingStockId(null);
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, stock: num } : p))
    );

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: num }),
      });
      if (res.ok) {
        showToast(`[STOCK UPDATED] ${prod.name} -> ${num}`);
        onMutated?.();
      } else {
        fetchProducts();
      }
    } catch {
      fetchProducts();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        if (selectedProductForAction && selectedProductForAction.id === id) {
          setSelectedProductForAction(null);
        }
        showToast("[DELETED] Product permanently purged from catalog.");
        onMutated?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete product");
      }
    } catch {
      setError("Network error deleting product");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const currencySymbol =
    currency === "EUR" ? "€" : currency === "TRY" ? "₺" : currency === "GBP" ? "£" : "$";

  // Filter & sort products client-side for instant responsiveness
  const filtered = products
    .filter((p) => {
      if (bestsellerOnly && !p.isBestseller) return false;
      if (categoryFilter !== "all") {
        const cat = p.category?.toLowerCase() || "";
        if (cat !== categoryFilter && !p.name.toLowerCase().includes(categoryFilter)) {
          return false;
        }
      }
      if (stockFilter === "in_stock" && p.stock <= 0) return false;
      if (stockFilter === "low_stock" && (p.stock <= 0 || p.stock > 3)) return false;
      if (stockFilter === "depleted" && p.stock > 0) return false;

      if (search.trim()) {
        const term = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "stock_desc") return b.stock - a.stock;
      if (sortBy === "stock_asc") return a.stock - b.stock;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Telemetry Calculations
  const totalPieces = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0);
  const bestsellersCount = products.filter((p) => p.isBestseller).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 3).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 right-4 sm:right-8 z-50 bg-[#FAF8F3] text-black px-4 py-2.5 font-mono text-xs uppercase font-bold tracking-widest border-2 border-black shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. METRICS RIBBON (Desktop 5-Col High-Density)                  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
        <div className="bg-[#101010] border border-[#222222] p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-[#777777] tracking-widest uppercase">
            CATALOG ITEMS
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl md:text-2xl font-bold text-[#FAF8F3] tracking-tight">
              {totalPieces}
            </span>
            <span className="text-[10px] text-[#555] uppercase">MODELS</span>
          </div>
        </div>

        <div className="bg-[#101010] border border-[#222222] p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-[#777777] tracking-widest uppercase">
            TOTAL STOCK
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl md:text-2xl font-bold text-[#FAF8F3] tracking-tight">
              {totalUnits}
            </span>
            <span className="text-[10px] text-[#555] uppercase">UNITS</span>
          </div>
        </div>

        <div className="bg-[#101010] border border-[#222222] p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-[#777777] tracking-widest uppercase">
            INVENTORY VALUATION
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl md:text-2xl font-bold text-emerald-400 tracking-tight">
              {currencySymbol}{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-emerald-600 uppercase font-mono">{currency}</span>
          </div>
        </div>

        <div className="bg-[#101010] border border-[#222222] p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-[#777777] tracking-widest uppercase">
            BESTSELLERS
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl md:text-2xl font-bold text-amber-300 tracking-tight">
              {bestsellersCount}
            </span>
            <span className="text-[10px] text-amber-500/80 uppercase">PROMOTED</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#101010] border border-[#222222] p-3.5 flex flex-col justify-between">
          <span className="text-[10px] text-[#777777] tracking-widest uppercase">
            STOCK WARNINGS
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-bold px-2 py-0.5 bg-red-950/80 border border-red-600/50 text-red-400">
              {outOfStockCount} OUT
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-amber-950/60 border border-amber-600/40 text-amber-300">
              {lowStockCount} LOW
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. ADVANCED DESKTOP TOOLBAR (Search, Filters, Sort, Actions)    */}
      {/* ============================================================== */}
      <div className="bg-[#101010] border border-[#222222] p-3.5 md:p-4 flex flex-col gap-3">
        {/* Row 1: Search & Primary CTA */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH BY TITLE, SLUG, CATEGORY, OR DESCRIPTION... (PRESS '/' TO FOCUS)"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3.5 py-2.5 rounded-none outline-none uppercase font-mono tracking-wider pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={fetchProducts}
              title="Refresh Catalog (Shortcut: R)"
              className="w-10 h-10 flex items-center justify-center border border-[#2A2A2A] hover:border-white text-[#888] hover:text-white bg-[#141414] shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
              className="min-h-[40px] bg-[#FAF8F3] text-[#0A0A0A] hover:bg-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>[ + NEW PRODUCT DROP (N) ]</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter Bar, Stock Filter, Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#1C1C1C] text-xs">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            <span className="text-[10px] text-[#666] uppercase font-bold shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              CATEGORY:
            </span>
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[#FAF8F3] text-black border-white"
                      : "bg-[#141414] text-[#777777] border-[#262626] hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Right Group: Stock Filter & Sort */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Stock Filters */}
            <div className="flex items-center border border-[#2A2A2A] bg-[#141414] p-0.5">
              {(
                [
                  { id: "all", label: "ALL" },
                  { id: "in_stock", label: "IN STOCK" },
                  { id: "low_stock", label: "LOW" },
                  { id: "depleted", label: "DEPLETED" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStockFilter(s.id)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase ${
                    stockFilter === s.id ? "bg-[#282828] text-white" : "text-[#777] hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Bestseller Toggle */}
            <button
              type="button"
              onClick={() => setBestsellerOnly(!bestsellerOnly)}
              className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider border flex items-center gap-1 ${
                bestsellerOnly
                  ? "bg-amber-400 text-black border-amber-400"
                  : "bg-[#141414] text-[#888] border-[#2A2A2A] hover:text-white"
              }`}
            >
              <Star className="w-3 h-3" />
              <span>BESTSELLERS</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-[10px] text-[#777]">
              <ArrowUpDown className="w-3 h-3" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-[#141414] border border-[#2A2A2A] text-white text-[10px] px-2 py-1 outline-none uppercase font-mono cursor-pointer"
              >
                <option value="newest">NEWEST FIRST</option>
                <option value="oldest">OLDEST FIRST</option>
                <option value="price_desc">PRICE: HIGH TO LOW</option>
                <option value="price_asc">PRICE: LOW TO HIGH</option>
                <option value="stock_desc">STOCK: HIGH TO LOW</option>
                <option value="stock_asc">STOCK: LOW TO HIGH</option>
                <option value="name_asc">TITLE: A-Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>[!] {error}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MOBILE COMPACT CARD LIST (< md)                              */}
      {/* ============================================================== */}
      <div className="block md:hidden">
        {loading ? (
          <div className="p-8 text-center text-xs tracking-widest text-[#666666] uppercase animate-pulse border border-[#1A1A1A]">
            SCANNING CATALOG REGISTRY...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs tracking-widest text-[#666666] uppercase border border-[#1A1A1A]">
            NO PRODUCTS MATCHING CRITERIA
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((prod) => {
              const img = prod.mediaUrls?.[0] || prod.images?.[0];
              const isOut = prod.stock <= 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductForAction(prod)}
                  className="bg-[#0E0E0E] border border-[#222222] active:border-white p-3 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-16 bg-[#161616] border border-[#2A2A2A] relative shrink-0 overflow-hidden flex items-center justify-center">
                      {img ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={img} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-[#555]">CYRUX</span>
                      )}
                      {prod.isBestseller && (
                        <div className="absolute top-0.5 right-0.5 bg-amber-400 text-black text-[8px] font-bold px-1">
                          ★
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="font-bold text-[#FAF8F3] text-xs uppercase truncate tracking-tight">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-[#666666] truncate lowercase">
                        /{prod.slug}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-white text-[11px]">
                          {currencySymbol}{prod.price.toFixed(2)}
                        </span>
                        <span className="text-[#444]">•</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 uppercase font-bold ${
                            isOut
                              ? "bg-red-950/80 border border-red-600/50 text-red-400"
                              : "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                          }`}
                        >
                          {isOut ? "DEPLETED (0)" : `STOCK: ${prod.stock}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProductForAction(prod);
                    }}
                    className="w-10 h-10 flex items-center justify-center text-[#888888] hover:text-white border border-[#262626] bg-[#141414] shrink-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. DESKTOP FULL DATA TABLE (>= md)                             */}
      {/* ============================================================== */}
      <div className="hidden md:block border border-[#222222] bg-[#0E0E0E] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#222222] bg-[#141414] text-[#888888] tracking-widest uppercase">
              <th className="py-3 px-4 font-normal w-16">MEDIA</th>
              <th className="py-3 px-4 font-normal">TITLE & SLUG</th>
              <th className="py-3 px-4 font-normal w-24">CATEGORY</th>
              <th className="py-3 px-4 font-normal w-24">UNIT PRICE</th>
              <th className="py-3 px-4 font-normal w-36">STOCK INVENTORY</th>
              <th className="py-3 px-4 font-normal w-28">VALUATION</th>
              <th className="py-3 px-4 font-normal w-28">STATUS</th>
              <th className="py-3 px-4 font-normal text-right w-44">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#666666] tracking-widest uppercase animate-pulse">
                  [ SCANNING CATALOG REGISTRY... ]
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#666666] tracking-widest uppercase">
                  [ NO PRODUCTS MATCHING CRITERIA ]
                </td>
              </tr>
            ) : (
              filtered.map((prod) => {
                const isOut = prod.stock <= 0;
                const isLow = prod.stock > 0 && prod.stock <= 3;
                const valuation = (prod.price || 0) * (prod.stock || 0);
                const isEditingStock = inlineEditingStockId === prod.id;

                return (
                  <tr key={prod.id} className="hover:bg-[#121212] transition-none group">
                    {/* Media thumbnail */}
                    <td className="py-3 px-4">
                      <div className="w-12 h-14 bg-[#1A1A1A] border border-[#2E2E2E] overflow-hidden relative flex items-center justify-center shrink-0">
                        {prod.mediaUrls && prod.mediaUrls[0] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prod.mediaUrls[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <span className="text-[9px] text-[#555555]">CYRUX</span>
                        )}
                        {prod.mediaUrls && prod.mediaUrls.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-black/90 text-white text-[8px] px-1 font-mono">
                            +{prod.mediaUrls.length - 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Title & Slug */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-bold text-[#FAF8F3] uppercase tracking-wider flex items-center gap-1.5">
                        <span>{prod.name}</span>
                        {prod.isBestseller && (
                          <span className="text-amber-400 text-[10px]" title="Bestseller">★</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#666666] lowercase flex items-center gap-2 mt-0.5">
                        <span>/{prod.slug}</span>
                        <Link
                          href={`/products/${prod.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-[#888] hover:text-white"
                          title="View live product"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 uppercase text-[#888888] font-mono text-[11px]">
                      {prod.category || "APPAREL"}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-mono font-bold text-[#FAF8F3]">
                      {currencySymbol}{prod.price.toFixed(2)}
                    </td>

                    {/* Stock with Steppers AND Direct Inline Click-to-Edit */}
                    <td className="py-3 px-4">
                      {isEditingStock ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            value={inlineStockValue}
                            onChange={(e) => setInlineStockValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveInlineStock(prod);
                              if (e.key === "Escape") {
                                cancelInlineEditRef.current = true;
                                setInlineEditingStockId(null);
                              }
                            }}
                            onBlur={() => handleSaveInlineStock(prod)}
                            className="w-16 bg-black border border-white text-white px-2 py-0.5 text-xs font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineStock(prod)}
                            className="p-1 bg-white text-black hover:bg-emerald-400"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Click to manually edit stock"
                            onClick={() => {
                              setInlineEditingStockId(prod.id);
                              setInlineStockValue(String(prod.stock));
                            }}
                            className={`text-[11px] px-2 py-0.5 font-mono cursor-pointer border ${
                              isOut
                                ? "bg-red-950/70 border-red-500/50 text-red-300 hover:border-white"
                                : isLow
                                ? "bg-amber-950/60 border-amber-500/40 text-amber-300 hover:border-white"
                                : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:border-white"
                            }`}
                          >
                            {isOut ? "OUT (0)" : `QTY: ${prod.stock}`}
                          </button>

                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateStock(prod, -1)}
                              disabled={prod.stock <= 0}
                              title="Decrease stock"
                              className="w-5 h-5 flex items-center justify-center bg-[#1C1C1C] border border-[#2E2E2E] hover:border-white disabled:opacity-20 cursor-pointer text-[#AAA] hover:text-white"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStock(prod, 1)}
                              title="Increase stock"
                              className="w-5 h-5 flex items-center justify-center bg-[#1C1C1C] border border-[#2E2E2E] hover:border-white cursor-pointer text-[#AAA] hover:text-white"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Inventory Valuation */}
                    <td className="py-3 px-4 font-mono text-[#888888] text-[11px]">
                      {currencySymbol}{valuation.toFixed(2)}
                    </td>

                    {/* Bestseller Promo Button */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleBestseller(prod)}
                        className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider border cursor-pointer ${
                          prod.isBestseller
                            ? "bg-amber-400 text-black border-amber-400"
                            : "bg-transparent text-[#666666] border-[#333333] hover:text-[#AAAAAA]"
                        }`}
                      >
                        {prod.isBestseller ? "★ PROMO" : "☆ STANDBY"}
                      </button>
                    </td>

                    {/* Desktop Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Direct AI Forge Asset Generator Trigger */}
                        <button
                          type="button"
                          onClick={() =>
                            onOpenAiStudio ? onOpenAiStudio(prod.id) : setAiModalProduct(prod)
                          }
                          title="Generate AI Assets via ElevenLabs & Assign"
                          className="text-[10px] text-amber-300 hover:text-white border border-amber-400/40 hover:border-amber-400 bg-amber-950/20 px-2 py-1 uppercase font-bold flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>AI FORGE</span>
                        </button>

                        {/* Edit Specifications */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setModalOpen(true);
                          }}
                          className="text-[10px] text-[#888888] hover:text-[#FAF8F3] border border-[#2E2E2E] hover:border-white px-2 py-1 uppercase"
                        >
                          EDIT
                        </button>

                        {/* Two-phase Deletion */}
                        {confirmDeleteId === prod.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(prod.id)}
                              disabled={deletingId === prod.id}
                              className="text-[10px] bg-red-900 text-white px-2 py-1 uppercase font-bold"
                            >
                              {deletingId === prod.id ? "..." : "CONFIRM"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] bg-[#222222] text-[#888888] px-1.5 py-1 uppercase"
                            >
                              NO
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(prod.id)}
                            className="text-[10px] text-[#666666] hover:text-red-400 border border-transparent hover:border-red-900/40 px-1.5 py-1 uppercase"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================== */}
      {/* 5. MOBILE BOTTOM SHEET FOR ROW DETAILS                         */}
      {/* ============================================================== */}
      {selectedProductForAction && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedProductForAction(null)}
            aria-hidden="true"
          />

          <div className="relative w-full bg-[#0C0C0C] border-t-2 border-white p-5 flex flex-col gap-4 z-10 shadow-2xl max-h-[85vh] overflow-y-auto font-mono text-xs">
            <div className="w-12 h-1 bg-[#444] rounded-full mx-auto -mt-1 mb-1" />

            <div className="flex items-center gap-3 pb-3 border-b border-[#222222]">
              <div className="w-14 h-16 bg-[#161616] border border-[#2A2A2A] relative shrink-0 overflow-hidden">
                {selectedProductForAction.mediaUrls?.[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedProductForAction.mediaUrls[0]}
                    alt={selectedProductForAction.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-[#555]">CYRUX</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-sm uppercase text-white truncate">
                  {selectedProductForAction.name}
                </h3>
                <span className="text-[10px] text-[#777] lowercase">/{selectedProductForAction.slug}</span>
                <span className="text-white font-bold text-xs mt-1">
                  {currencySymbol}{selectedProductForAction.price.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const p = selectedProductForAction;
                  setSelectedProductForAction(null);
                  setAiModalProduct(p);
                }}
                className="py-3 bg-amber-400 text-black font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>AI FORGE SYNTHESIZER</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = selectedProductForAction;
                  setSelectedProductForAction(null);
                  setEditingProduct(p);
                  setModalOpen(true);
                }}
                className="py-3 bg-[#181818] border border-[#333] text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>EDIT SPECIFICATIONS</span>
              </button>

              <Link
                href={`/products/${selectedProductForAction.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 bg-[#121212] border border-[#222] text-[#AAA] hover:text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>STOREFRONT VIEW</span>
              </Link>

              <button
                type="button"
                onClick={() => handleDelete(selectedProductForAction.id)}
                className="py-3 bg-red-950/40 border border-red-900/60 text-red-400 font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>DELETE PRODUCT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CREATE / EDIT PRODUCT MODAL                                 */}
      {/* ============================================================== */}
      <NewProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onCreated={() => {
          fetchProducts();
          onMutated?.();
          setEditingProduct(null);
          showToast("[CATALOG UPDATED] Changes saved successfully.");
        }}
        productToEdit={editingProduct}
      />

      {/* ============================================================== */}
      {/* 7. ROW-TRIGGERED AI STUDIO FORGE MODAL                         */}
      {/* ============================================================== */}
      {aiModalProduct && (
        <AiStudioModal
          mode="modal"
          isOpen={true}
          initialTargetType="product"
          initialTargetId={aiModalProduct.id}
          onClose={() => setAiModalProduct(null)}
          onAssetAssigned={() => {
            fetchProducts();
            onMutated?.();
            showToast(`[AI ASSET ATTACHED] Linked to ${aiModalProduct.name}`);
          }}
        />
      )}
    </div>
  );
}
