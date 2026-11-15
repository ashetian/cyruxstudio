"use client";

import React, { useState, useEffect, useCallback } from "react";
import { NewProductModal } from "./new-product-modal";

export interface ProductItem {
  id: string;
  name: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  variants: Array<{ size?: string; stock?: number; id?: string; name?: string; inStock?: boolean }>;
  mediaUrls: string[];
  images: string[];
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

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBestseller: nextState }),
      });
      if (!res.ok) {
        // Revert on failure
        fetchProducts();
      }
    } catch {
      fetchProducts();
    }
  };

  const updateStock = async (prod: ProductItem, delta: number) => {
    const newStock = Math.max(0, prod.stock + delta);
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p))
    );

    try {
      await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });
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
    <div className="flex flex-col gap-6 font-mono">
      {/* Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#121212] border border-[#222222] p-4 flex flex-col">
          <span className="text-[11px] text-[#888888] tracking-widest uppercase">
            TOTAL CATALOG DROPS
          </span>
          <span className="text-2xl font-bold text-[#FAF8F3] tracking-tight">
            {totalDrops}
          </span>
        </div>

        <div className="bg-[#121212] border border-[#222222] p-4 flex flex-col">
          <span className="text-[11px] text-[#888888] tracking-widest uppercase">
            ACTIVE BESTSELLERS
          </span>
          <span className="text-2xl font-bold text-amber-300 tracking-tight">
            {bestsellersCount}
          </span>
        </div>

        <div className="bg-[#121212] border border-[#222222] p-4 flex flex-col">
          <span className="text-[11px] text-[#888888] tracking-widest uppercase">
            DEPLETED / OUT OF STOCK
          </span>
          <span className="text-2xl font-bold text-red-400 tracking-tight">
            {outOfStockCount}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121212] border border-[#222222] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER BY NAME, SLUG, CATEGORY..."
            className="bg-[#0A0A0A] border border-[#333333] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3.5 py-2.5 rounded-none outline-none uppercase min-w-[240px]"
          />

          <button
            onClick={() => setBestsellerOnly(!bestsellerOnly)}
            className={`px-3 py-2 text-xs uppercase font-bold tracking-wider rounded-none cursor-pointer border ${
              bestsellerOnly
                ? "bg-amber-400 text-black border-amber-400"
                : "bg-transparent text-[#888888] border-[#333333] hover:text-[#FAF8F3]"
            }`}
          >
            {bestsellerOnly ? "[★ BESTSELLERS ONLY]" : "[☆ ALL PRODUCTS]"}
          </button>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#FAF8F3] text-[#0A0A0A] hover:bg-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-none cursor-pointer"
        >
          [ + NEW PRODUCT DROP ]
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider">
          [!] {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-[#222222] bg-[#0E0E0E] overflow-x-auto">
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
                        {prod.stock > 0 ? `QTY: ${prod.stock}` : "SOLD OUT"}
                      </span>
                      <button
                        onClick={() => updateStock(prod, -1)}
                        className="w-5 h-5 bg-[#1E1E1E] border border-[#333333] hover:border-[#FAF8F3] text-[#FAF8F3] flex items-center justify-center text-[10px]"
                      >
                        -
                      </button>
                      <button
                        onClick={() => updateStock(prod, 1)}
                        className="w-5 h-5 bg-[#1E1E1E] border border-[#333333] hover:border-[#FAF8F3] text-[#FAF8F3] flex items-center justify-center text-[10px]"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Variants */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {prod.variants && prod.variants.length > 0 ? (
                        prod.variants.map((v, i) => (
                          <span
                            key={i}
                            className="bg-[#1A1A1A] border border-[#262626] text-[10px] px-1.5 py-0.5 text-[#AAAAAA]"
                          >
                            {v.size || v.name || "?"}:{v.stock !== undefined ? v.stock : "✓"}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#555555]">STANDARD</span>
                      )}
                    </div>
                  </td>

                  {/* Bestseller */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleBestseller(prod)}
                      className={`text-[11px] font-bold tracking-wider px-2.5 py-1 border transition-none cursor-pointer ${
                        prod.isBestseller
                          ? "bg-amber-400 text-black border-amber-400"
                          : "bg-transparent text-[#666666] border-[#333333] hover:text-[#FAF8F3]"
                      }`}
                    >
                      {prod.isBestseller ? "[★ BESTSELLER]" : "[☆ REGULAR]"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    {confirmDeleteId === prod.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(prod.id)}
                          disabled={deletingId === prod.id}
                          className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-2 py-1 font-bold uppercase rounded-none"
                        >
                          {deletingId === prod.id ? "DELETING..." : "CONFIRM DELETE?"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[#888888] hover:text-[#FAF8F3] text-[10px] uppercase"
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(prod.id)}
                        className="text-red-400 hover:text-red-300 text-[11px] uppercase tracking-wider"
                      >
                        [DELETE ✕]
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <NewProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => fetchProducts()}
      />
    </div>
  );
}
