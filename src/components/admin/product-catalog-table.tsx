"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { NewProductModal } from "./new-product-modal";
import { Star, Plus, Minus, Trash2, Edit3, ExternalLink, X, MoreVertical } from "lucide-react";

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
}

export function ProductCatalogTable({ currency = "USD" }: ProductCatalogTableProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [selectedProductForAction, setSelectedProductForAction] = useState<ProductItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
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
      if (!res.ok) {
        fetchProducts();
      }
    } catch {
      fetchProducts();
    }
  };

  const updateStock = async (prod: ProductItem, delta: number) => {
    const newStock = Math.max(0, prod.stock + delta);
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p))
    );
    if (selectedProductForAction && selectedProductForAction.id === prod.id) {
      setSelectedProductForAction({
        ...selectedProductForAction,
        stock: newStock,
      });
    }

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!res.ok) {
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

  // Filter products
  const filtered = products.filter((p) => {
    if (bestsellerOnly && !p.isBestseller) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalDrops = products.length;
  const bestsellersCount = products.filter((p) => p.isBestseller).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* ============================================================== */}
      {/* 1. METRICS RIBBON (Responsive: 3 col compact on mobile)         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="bg-[#111111] border border-[#222222] p-3 md:p-4 flex flex-col justify-between">
          <span className="text-[9px] md:text-[11px] text-[#777777] tracking-widest uppercase">
            TOTAL
          </span>
          <span className="text-xl md:text-2xl font-bold text-[#FAF8F3] tracking-tight mt-1">
            {totalDrops}
          </span>
        </div>

        <div className="bg-[#111111] border border-[#222222] p-3 md:p-4 flex flex-col justify-between">
          <span className="text-[9px] md:text-[11px] text-[#777777] tracking-widest uppercase">
            BESTSELLERS
          </span>
          <span className="text-xl md:text-2xl font-bold text-amber-300 tracking-tight mt-1">
            {bestsellersCount}
          </span>
        </div>

        <div className="bg-[#111111] border border-[#222222] p-3 md:p-4 flex flex-col justify-between">
          <span className="text-[9px] md:text-[11px] text-[#777777] tracking-widest uppercase">
            DEPLETED
          </span>
          <span className="text-xl md:text-2xl font-bold text-red-400 tracking-tight mt-1">
            {outOfStockCount}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SEARCH & ACTION TOOLBAR (Mobile-First Ergonomics)            */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111111] border border-[#222222] p-3.5 md:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH BY NAME, SLUG, CATEGORY..."
            className="w-full sm:w-auto flex-1 bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3.5 py-2.5 rounded-none outline-none uppercase min-w-0"
          />

          <button
            onClick={() => setBestsellerOnly(!bestsellerOnly)}
            className={`min-h-[42px] px-3.5 py-2 text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer border flex items-center justify-center gap-1.5 shrink-0 ${
              bestsellerOnly
                ? "bg-amber-400 text-black border-amber-400"
                : "bg-transparent text-[#888888] border-[#2E2E2E] hover:text-[#FAF8F3]"
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>{bestsellerOnly ? "BESTSELLERS ONLY" : "ALL CATALOG"}</span>
          </button>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
          className="min-h-[44px] bg-[#FAF8F3] text-[#0A0A0A] hover:bg-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-none cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>[ + NEW PRODUCT DROP ]</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider">
          [!] {error}
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
                  {/* Left: Thumbnail & Badges */}
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

                    {/* Middle: Details */}
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

                  {/* Right: Quick Action Sheet Trigger */}
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
            <tr className="border-b border-[#222222] bg-[#161616] text-[#888888] tracking-widest uppercase">
              <th className="py-3 px-4 font-normal">MEDIA</th>
              <th className="py-3 px-4 font-normal">TITLE / SLUG</th>
              <th className="py-3 px-4 font-normal">PRICE</th>
              <th className="py-3 px-4 font-normal">STOCK</th>
              <th className="py-3 px-4 font-normal">VARIANTS</th>
              <th className="py-3 px-4 font-normal">BESTSELLER</th>
              <th className="py-3 px-4 font-normal text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#666666] tracking-widest uppercase">
                  [ SCANNING CATALOG REGISTRY... ]
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#666666] tracking-widest uppercase">
                  [ NO PRODUCTS MATCHING CRITERIA ]
                </td>
              </tr>
            ) : (
              filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#121212] transition-none">
                  {/* Media */}
                  <td className="py-3 px-4">
                    <div className="w-12 h-12 bg-[#1A1A1A] border border-[#2E2E2E] overflow-hidden flex items-center justify-center">
                      {prod.mediaUrls && prod.mediaUrls[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={prod.mediaUrls[0]}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#555555]">CYRUX</span>
                      )}
                    </div>
                  </td>

                  {/* Title & Slug */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#FAF8F3] uppercase tracking-wider">
                      {prod.name}
                    </div>
                    <div className="text-[11px] text-[#666666] lowercase">
                      /{prod.slug}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 font-mono text-[#FAF8F3]">
                    {currencySymbol}
                    {prod.price.toFixed(2)}
                  </td>

                  {/* Stock with quick +/- */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 font-mono ${
                          prod.stock > 0
                            ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                            : "bg-red-950/60 border border-red-500/40 text-red-300"
                        }`}
                      >
                        {prod.stock}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateStock(prod, -1)}
                          disabled={prod.stock <= 0}
                          className="w-5 h-5 flex items-center justify-center bg-[#1E1E1E] border border-[#333333] hover:border-white disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          onClick={() => updateStock(prod, 1)}
                          className="w-5 h-5 flex items-center justify-center bg-[#1E1E1E] border border-[#333333] hover:border-white cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Variants */}
                  <td className="py-3 px-4 text-[#888888]">
                    {Array.isArray(prod.variants) && prod.variants.length > 0
                      ? prod.variants
                          .map((v) => `${v.size || v.name || "?"}:${v.stock ?? "?"}`)
                          .join(", ")
                      : "UNIVERSAL"}
                  </td>

                  {/* Bestseller toggle */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleBestseller(prod)}
                      className={`text-xs px-2.5 py-1 font-bold uppercase tracking-wider border cursor-pointer ${
                        prod.isBestseller
                          ? "bg-amber-400 text-black border-amber-400"
                          : "bg-transparent text-[#666666] border-[#333333] hover:text-[#AAAAAA]"
                      }`}
                    >
                      {prod.isBestseller ? "★ ACTIVE" : "☆ PROMO"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setModalOpen(true);
                        }}
                        className="text-xs text-[#888888] hover:text-[#FAF8F3] border border-[#2E2E2E] px-2 py-1 uppercase"
                      >
                        [EDIT]
                      </button>

                      {confirmDeleteId === prod.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(prod.id)}
                            disabled={deletingId === prod.id}
                            className="text-xs bg-red-900/80 text-white px-2 py-1 uppercase font-bold"
                          >
                            {deletingId === prod.id ? "..." : "CONFIRM"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs bg-[#222222] text-[#888888] px-2 py-1 uppercase"
                          >
                            NO
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(prod.id)}
                          className="text-xs text-[#666666] hover:text-red-400 border border-transparent hover:border-red-900/40 px-2 py-1 uppercase"
                        >
                          [DEL]
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================== */}
      {/* 5. MOBILE PRODUCT ACTION SHEET (Bottom Drawer on Card Tap)     */}
      {/* ============================================================== */}
      {selectedProductForAction && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedProductForAction(null)}
            aria-hidden="true"
          />

          {/* Action Sheet Surface */}
          <div className="relative w-full bg-[#0C0C0C] border-t-2 border-white p-5 flex flex-col gap-4 z-10 shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Grab indicator */}
            <div className="w-12 h-1 bg-[#444] rounded-full mx-auto -mt-1 mb-1" />

            {/* Product Overview Header */}
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
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-[#888888] uppercase block">QUICK ACTIONS</span>
                <h4 className="font-bold text-sm text-white uppercase truncate">
                  {selectedProductForAction.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white font-bold text-xs">
                    {currencySymbol}{selectedProductForAction.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#666666]">
                    /{selectedProductForAction.slug}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductForAction(null)}
                className="w-10 h-10 flex items-center justify-center border border-[#2E2E2E] text-[#888888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action 1: Rapid Stock Stepper */}
            <div className="bg-[#121212] border border-[#222222] p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#888] uppercase block">INVENTORY STOCK</span>
                <span className="text-white font-bold text-sm">
                  {selectedProductForAction.stock} PIECES AVAILABLE
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateStock(selectedProductForAction, -1)}
                  disabled={selectedProductForAction.stock <= 0}
                  className="w-11 h-11 flex items-center justify-center bg-[#1C1C1C] border border-[#333] active:border-white disabled:opacity-30 text-white font-bold text-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateStock(selectedProductForAction, 1)}
                  className="w-11 h-11 flex items-center justify-center bg-[#1C1C1C] border border-[#333] active:border-white text-white font-bold text-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action 2: Toggle Bestseller */}
            <button
              type="button"
              onClick={() => toggleBestseller(selectedProductForAction)}
              className={`min-h-[48px] px-4 font-bold uppercase tracking-wider flex items-center justify-between border cursor-pointer ${
                selectedProductForAction.isBestseller
                  ? "bg-amber-400 text-black border-amber-400"
                  : "bg-[#141414] text-[#FAF8F3] border-[#2A2A2A]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>
                  {selectedProductForAction.isBestseller
                    ? "BESTSELLER STATUS: ACTIVE"
                    : "MARK AS BESTSELLER"}
                </span>
              </div>
              <span className="text-[10px]">
                {selectedProductForAction.isBestseller ? "[★ FEATURED]" : "[☆ NORMAL]"}
              </span>
            </button>

            {/* Action 3: Edit Product Specs */}
            <button
              type="button"
              onClick={() => {
                setEditingProduct(selectedProductForAction);
                setSelectedProductForAction(null);
                setModalOpen(true);
              }}
              className="min-h-[48px] px-4 bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2E2E2E] font-bold uppercase tracking-wider flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                <span>EDIT PRODUCT SPECIFICATIONS</span>
              </div>
              <span className="text-[10px] text-[#888]">[OPEN SHEET]</span>
            </button>

            {/* Action 4: Storefront View Link */}
            <Link
              href={`/products/${selectedProductForAction.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-4 bg-[#101010] text-[#AAAAAA] hover:text-white border border-[#222222] font-bold uppercase tracking-wider flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <span>VIEW ON PUBLIC STOREFRONT</span>
              </div>
              <span className="text-[10px]">[↗]</span>
            </Link>

            {/* Action 5: Delete Product with Confirmation */}
            {confirmDeleteId === selectedProductForAction.id ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedProductForAction.id)}
                  disabled={deletingId === selectedProductForAction.id}
                  className="flex-1 min-h-[48px] bg-red-900 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deletingId === selectedProductForAction.id ? "DELETING..." : "CONFIRM PERMANENT DELETE"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="min-h-[48px] px-4 bg-[#222] text-[#888] uppercase font-bold"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(selectedProductForAction.id)}
                className="min-h-[48px] px-4 bg-red-950/20 text-red-400 border border-red-900/40 font-bold uppercase tracking-wider flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>DELETE FROM CATALOG</span>
                </div>
                <span className="text-[10px]">[REMOVE]</span>
              </button>
            )}

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setSelectedProductForAction(null)}
              className="min-h-[44px] bg-[#141414] text-[#888] hover:text-white uppercase font-bold text-center tracking-wider mt-1 border border-[#222]"
            >
              [ CLOSE SHEET ]
            </button>
          </div>
        </div>
      )}

      {/* Creation / Edit Product Modal (Bottom Sheet on Mobile) */}
      <NewProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onCreated={() => {
          fetchProducts();
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />
    </div>
  );
}
