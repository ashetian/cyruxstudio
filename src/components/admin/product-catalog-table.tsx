"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { NewProductModal } from "./new-product-modal";
import { ProductEditModal } from "./product-edit-modal";
import { AiStudioModal } from "./ai-studio-modal";
import { AdminBottomSheet } from "./admin-bottom-sheet";
import {
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
  Eye,
  EyeOff,
} from "lucide-react";

export interface ProductItem {
  id: string;
  name: string;
  title?: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  variants: Array<{
    size?: string;
    stock?: number;
    id?: string;
    name?: string;
    inStock?: boolean;
  }>;
  mediaUrls: string[];
  images?: string[];
  isBestseller: boolean;
  badge: string | null;
  category: string;
  sku?: string | null;
  collectionId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  color?: string | null;
  colorHex?: string | null;
  twinProductSlug?: string | null;
  isDiptych?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCatalogTableProps {
  currency?: string;
  initialEditProductId?: string | null;
  onClearInitialEditProduct?: () => void;
  onOpenAiStudio?: (productId?: string) => void;
  onMutated?: () => void;
}

interface CollectionOption {
  id: string;
  slug: string;
  name: { tr: string; en: string };
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "outerwear", label: "Outerwear" },
  { id: "tops", label: "Tops & Hoodies" },
  { id: "bottoms", label: "Bottoms & Cargo" },
  { id: "tailoring", label: "Tailoring" },
  { id: "footwear", label: "Footwear" },
  { id: "accessories", label: "Accessories" },
  { id: "leather", label: "Leather Goods" },
];

export function ProductCatalogTable({
  currency = "USD",
  initialEditProductId,
  onClearInitialEditProduct,
  onOpenAiStudio,
  onMutated,
}: ProductCatalogTableProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [stockFilter, setStockFilter] = useState<
    "all" | "in_stock" | "low_stock" | "depleted"
  >("all");
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [sortBy, setSortBy] = useState<
    | "newest"
    | "oldest"
    | "price_desc"
    | "price_asc"
    | "stock_desc"
    | "stock_asc"
    | "name_asc"
    | "sort_order"
  >("newest");

  const [inlineEditingStockId, setInlineEditingStockId] = useState<string | null>(null);
  const [inlineStockValue, setInlineStockValue] = useState<string>("");
  const cancelInlineEditRef = useRef(false);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [selectedProductForAction, setSelectedProductForAction] =
    useState<ProductItem | null>(null);
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
      const [prodRes, colRes] = await Promise.all([
        fetch("/api/admin/products?limit=100"),
        fetch("/api/admin/collections?limit=100"),
      ]);
      const prodData = (await prodRes.json().catch(() => ({}))) as {
        success?: boolean;
        products?: ProductItem[];
        error?: string;
      };
      const colData = (await colRes.json().catch(() => ({}))) as {
        success?: boolean;
        collections?: CollectionOption[];
      };

      if (prodRes.ok && prodData.success) {
        setProducts(prodData.products || []);
      } else {
        setError(prodData.error || "Failed to fetch catalog");
      }

      if (colRes.ok && colData.success && Array.isArray(colData.collections)) {
        setCollections(colData.collections);
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

  useEffect(() => {
    if (!initialEditProductId || loading) return;
    const match = products.find((p) => p.id === initialEditProductId);
    if (match) {
      setEditingProduct(match);
      onClearInitialEditProduct?.();
      return;
    }

    let active = true;
    fetch(`/api/admin/products/${encodeURIComponent(initialEditProductId)}`)
      .then((res) => res.json().catch(() => null))
      .then((data: { success?: boolean; product?: ProductItem } | null) => {
        if (!active) return;
        if (data?.success && data.product) {
          setEditingProduct(data.product);
        }
        onClearInitialEditProduct?.();
      })
      .catch(() => {
        if (active) {
          onClearInitialEditProduct?.();
        }
      });

    return () => {
      active = false;
    };
  }, [initialEditProductId, loading, products, onClearInitialEditProduct]);

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
        setNewModalOpen(true);
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
    const nextBadge = nextState
      ? prod.badge && prod.badge.trim()
        ? prod.badge
        : "BESTSELLER"
      : prod.badge?.toUpperCase() === "BESTSELLER"
      ? null
      : prod.badge ?? null;

    setProducts((prev) =>
      prev.map((p) =>
        p.id === prod.id
          ? { ...p, isBestseller: nextState, badge: nextBadge }
          : p
      )
    );

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBestseller: nextState, badge: nextBadge }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as {
          product?: ProductItem;
        } | null;
        if (data?.product) {
          setProducts((prev) =>
            prev.map((p) => (p.id === prod.id ? data.product! : p))
          );
        }
        showToast(
          `${prod.name}: ${nextState ? "promoted to bestseller" : "removed from bestsellers"}`
        );
        onMutated?.();
      } else {
        fetchProducts();
      }
    } catch {
      fetchProducts();
    }
  };

  const toggleIsActive = async (prod: ProductItem) => {
    const nextActive = prod.isActive === false;
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, isActive: nextActive } : p))
    );
    if (selectedProductForAction?.id === prod.id) {
      setSelectedProductForAction({ ...selectedProductForAction, isActive: nextActive });
    }

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) {
        showToast(`${prod.name}: ${nextActive ? "visible on storefront" : "hidden"}`);
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
        showToast(`${prod.name} stock updated to ${nextStock}`);
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
        showToast(`${prod.name} stock set to ${num}`);
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
        showToast("Product removed from catalog.");
        onMutated?.();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
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

  const resolveCollectionName = (colId?: string | null) => {
    if (!colId) return null;
    const found = collections.find((c) => c.id === colId);
    return found ? found.name.en || found.name.tr : null;
  };

  const filtered = products
    .filter((p) => {
      if (bestsellerOnly && !p.isBestseller) return false;
      if (categoryFilter !== "all") {
        const cat = p.category?.toLowerCase() || "";
        if (cat !== categoryFilter && !p.name.toLowerCase().includes(categoryFilter)) {
          return false;
        }
      }
      if (collectionFilter === "none" && p.collectionId) return false;
      if (
        collectionFilter !== "all" &&
        collectionFilter !== "none" &&
        p.collectionId !== collectionFilter
      ) {
        return false;
      }
      if (activeFilter === "active" && p.isActive === false) return false;
      if (activeFilter === "inactive" && p.isActive !== false) return false;
      if (stockFilter === "in_stock" && p.stock <= 0) return false;
      if (stockFilter === "low_stock" && (p.stock <= 0 || p.stock > 3)) return false;
      if (stockFilter === "depleted" && p.stock > 0) return false;

      if (search.trim()) {
        const term = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          (p.badge && p.badge.toLowerCase().includes(term)) ||
          p.description?.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "sort_order") return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "stock_desc") return b.stock - a.stock;
      if (sortBy === "stock_asc") return a.stock - b.stock;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "oldest")
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const totalPieces = products.length;
  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalValuation = products.reduce(
    (acc, p) => acc + (p.discountPrice ?? p.price ?? 0) * (p.stock || 0),
    0
  );
  const bestsellersCount = products.filter((p) => p.isBestseller).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 3).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="flex flex-col gap-5 bg-[#FAF8F3] text-[#0A0A0A]">
      {toastMessage && (
        <div className="fixed top-16 right-4 sm:right-8 z-50 bg-[#FFFFFF] text-[#0A0A0A] px-4 py-3 text-xs font-medium border border-[#0A0A0A] shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 flex flex-col justify-between min-w-0">
          <span className="text-[11px] text-[#525252] tracking-wider uppercase">
            Catalog Items
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl md:text-2xl font-mono font-semibold text-[#0A0A0A]">
              {totalPieces}
            </span>
            <span className="text-[11px] text-[#737373] uppercase">Models</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 flex flex-col justify-between min-w-0">
          <span className="text-[11px] text-[#525252] tracking-wider uppercase">
            Total Stock
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl md:text-2xl font-mono font-semibold text-[#0A0A0A]">
              {totalUnits}
            </span>
            <span className="text-[11px] text-[#737373] uppercase">Units</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 flex flex-col justify-between min-w-0">
          <span className="text-[11px] text-[#525252] tracking-wider uppercase">
            Valuation
          </span>
          <div className="flex items-baseline justify-between mt-1 gap-1">
            <span className="text-xl md:text-2xl font-mono font-semibold text-[#0A0A0A] truncate">
              {currencySymbol}
              {totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-[#525252] font-mono uppercase">{currency}</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 flex flex-col justify-between min-w-0">
          <span className="text-[11px] text-[#525252] tracking-wider uppercase">
            Bestsellers
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl md:text-2xl font-mono font-semibold text-[#0A0A0A]">
              {bestsellersCount}
            </span>
            <span className="text-[11px] text-[#737373] uppercase">Featured</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 flex flex-col justify-between min-w-0">
          <span className="text-[11px] text-[#525252] tracking-wider uppercase">
            Stock Alerts
          </span>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-red-50 border border-red-300 text-red-900">
              {outOfStockCount} Out
            </span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-900">
              {lowStockCount} Low
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 md:p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, slug, badge, or category..."
                aria-label="Search products"
                className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 pr-11 placeholder:text-[#737373]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={fetchProducts}
              aria-label="Refresh catalog"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] bg-[#FFFFFF] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setNewModalOpen(true);
            }}
            className="min-h-[44px] bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider px-5 py-2.5 cursor-pointer flex items-center justify-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8E4DC] text-xs">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full [scrollbar-width:none]">
            <span className="text-[11px] text-[#525252] uppercase font-medium shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Category:
            </span>
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`min-h-[44px] px-3 py-2 text-xs font-medium uppercase tracking-wider border whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                    active
                      ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                      : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Right Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:ml-auto">
            <div className="flex flex-wrap items-center border border-[#E8E4DC] bg-[#FAF8F3] p-0.5 gap-0.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "in_stock", label: "In Stock" },
                  { id: "low_stock", label: "Low" },
                  { id: "depleted", label: "Out" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStockFilter(s.id)}
                  className={`min-h-[44px] px-3 py-1.5 text-xs font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                    stockFilter === s.id
                      ? "bg-[#0A0A0A] text-[#FFFFFF]"
                      : "text-[#525252] hover:text-[#0A0A0A]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setBestsellerOnly(!bestsellerOnly)}
              className={`min-h-[44px] px-3 py-1.5 text-xs uppercase font-medium tracking-wider border flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                bestsellerOnly
                  ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                  : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bestsellers</span>
            </button>

            <select
              aria-label="Filter by collection"
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="min-h-[44px] max-w-full bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <option value="all">All Collections</option>
              <option value="none">Unassigned</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.en || c.name.tr}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by visibility"
              value={activeFilter}
              onChange={(e) =>
                setActiveFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="min-h-[44px] max-w-full bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <option value="all">All Visibility</option>
              <option value="active">Active Only</option>
              <option value="inactive">Hidden Only</option>
            </select>

            <div className="flex items-center gap-1.5 max-w-full">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#525252] shrink-0" />
              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="min-h-[44px] max-w-full bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="sort_order">Sort Order</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="stock_desc">Stock: High to Low</option>
                <option value="stock_asc">Stock: Low to High</option>
                <option value="name_asc">Title: A-Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          <span>{error}</span>
        </div>
      )}

      {/* Mobile Card List (< md) */}
      <div className="block md:hidden">
        {loading ? (
          <div className="p-8 text-center text-xs tracking-wider text-[#525252] uppercase bg-[#FFFFFF] border border-[#E8E4DC]">
            Loading catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs tracking-wider text-[#525252] uppercase bg-[#FFFFFF] border border-[#E8E4DC]">
            No products match your filters.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((prod) => {
              const img = prod.mediaUrls?.[0] || prod.images?.[0];
              const isOut = prod.stock <= 0;
              const colName = resolveCollectionName(prod.collectionId);
              const hasDiscount =
                prod.discountPrice != null && prod.discountPrice < prod.price;

              return (
                <div
                  key={prod.id}
                  className="bg-[#FFFFFF] border border-[#E8E4DC] p-3 flex items-center justify-between gap-3 min-w-0"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProductForAction(prod)}
                    className="min-h-[44px] flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    <div className="w-14 h-16 bg-[#FAF8F3] border border-[#E8E4DC] relative shrink-0 overflow-hidden flex items-center justify-center">
                      {img ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={img}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#737373]">CYRUX</span>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[#0A0A0A] text-xs truncate">
                          {prod.name}
                        </span>
                        {prod.isActive === false && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#F4F1EA] border border-[#E8E4DC] text-[#525252]">
                            Hidden
                          </span>
                        )}
                        {(prod.badge || prod.isBestseller) && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] font-medium uppercase">
                            {prod.badge || "Bestseller"}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#737373] truncate font-mono">
                        /{prod.slug}
                        {colName ? ` • ${colName}` : ""}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {hasDiscount ? (
                          <span className="font-mono text-xs flex items-center gap-1.5">
                            <strong className="text-[#0A0A0A]">
                              {currencySymbol}
                              {Number(prod.discountPrice).toFixed(2)}
                            </strong>
                            <span className="line-through text-[#737373]">
                              {currencySymbol}
                              {prod.price.toFixed(2)}
                            </span>
                          </span>
                        ) : (
                          <span className="font-mono font-semibold text-[#0A0A0A] text-xs">
                            {currencySymbol}
                            {prod.price.toFixed(2)}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 border font-medium ${
                            isOut
                              ? "bg-red-50 border-red-300 text-red-900"
                              : "bg-emerald-50 border-emerald-300 text-emerald-900"
                          }`}
                        >
                          {isOut ? "Out of stock" : `Stock: ${prod.stock}`}
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProductForAction(prod)}
                    aria-label={`Actions for ${prod.name}`}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#0A0A0A] border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Data Table (>= md) */}
      <div className="hidden md:block border border-[#E8E4DC] bg-[#FFFFFF] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E8E4DC] bg-[#FAF8F3] text-[#525252] tracking-wider uppercase">
              <th className="py-3 px-4 font-medium w-16">Media</th>
              <th className="py-3 px-4 font-medium">Product & Collection</th>
              <th className="py-3 px-4 font-medium w-28">Category</th>
              <th className="py-3 px-4 font-medium w-32">Price</th>
              <th className="py-3 px-4 font-medium w-44">Stock</th>
              <th className="py-3 px-4 font-medium w-36">Visibility & Flag</th>
              <th className="py-3 px-4 font-medium text-right w-52">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E4DC]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#525252] uppercase">
                  Loading catalog...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#525252] uppercase">
                  No products match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((prod) => {
                const isOut = prod.stock <= 0;
                const isLow = prod.stock > 0 && prod.stock <= 3;
                const isEditingStock = inlineEditingStockId === prod.id;
                const colName = resolveCollectionName(prod.collectionId);
                const hasDiscount =
                  prod.discountPrice != null && prod.discountPrice < prod.price;

                return (
                  <tr key={prod.id} className="hover:bg-[#FAF8F3]/60">
                    <td className="py-3 px-4">
                      <div className="w-12 h-14 bg-[#FAF8F3] border border-[#E8E4DC] overflow-hidden relative flex items-center justify-center shrink-0">
                        {prod.mediaUrls && prod.mediaUrls[0] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prod.mediaUrls[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-[#737373]">CYRUX</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-semibold text-[#0A0A0A] flex items-center gap-2 flex-wrap">
                        <span>{prod.name}</span>
                        {(prod.badge || prod.isBestseller) && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] uppercase">
                            {prod.badge || "BESTSELLER"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#525252] flex items-center gap-2 mt-1 font-mono">
                        <span>/{prod.slug}</span>
                        {colName && <span className="text-[#0A0A0A]">• {colName}</span>}
                        <Link
                          href={`/products/${prod.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View ${prod.name} on storefront`}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer text-[#525252] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>

                    <td className="py-3 px-4 uppercase text-[#525252] text-[11px]">
                      {prod.category || "apparel"}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {hasDiscount ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#0A0A0A]">
                            {currencySymbol}
                            {Number(prod.discountPrice).toFixed(2)}
                          </span>
                          <span className="text-[11px] line-through text-[#737373]">
                            {currencySymbol}
                            {prod.price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-[#0A0A0A]">
                          {currencySymbol}
                          {prod.price.toFixed(2)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {isEditingStock ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            aria-label={`Stock quantity for ${prod.name}`}
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
                            className="w-20 min-h-[44px] bg-[#FFFFFF] border border-[#0A0A0A] text-[#0A0A0A] px-2 py-1 text-base md:text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineStock(prod)}
                            aria-label="Save stock"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#0A0A0A] text-[#FFFFFF] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setInlineEditingStockId(prod.id);
                              setInlineStockValue(String(prod.stock));
                            }}
                            aria-label={`Edit stock for ${prod.name} (current ${prod.stock})`}
                            className={`min-h-[44px] text-[11px] px-2.5 py-1 font-mono cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                              isOut
                                ? "bg-red-50 border-red-300 text-red-900"
                                : isLow
                                ? "bg-amber-50 border-amber-300 text-amber-900"
                                : "bg-emerald-50 border-emerald-300 text-emerald-900"
                            }`}
                          >
                            {isOut ? "Out (0)" : `${prod.stock}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(prod, -1)}
                            disabled={prod.stock <= 0}
                            aria-label="Decrease stock"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FAF8F3] border border-[#E8E4DC] hover:border-[#0A0A0A] disabled:opacity-30 cursor-pointer text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(prod, 1)}
                            aria-label="Increase stock"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FAF8F3] border border-[#E8E4DC] hover:border-[#0A0A0A] cursor-pointer text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleIsActive(prod)}
                          className={`min-h-[44px] px-2.5 py-1 text-[11px] font-medium uppercase border cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                            prod.isActive !== false
                              ? "bg-[#FFFFFF] text-[#0A0A0A] border-[#E8E4DC]"
                              : "bg-[#F4F1EA] text-[#525252] border-[#E8E4DC]"
                          }`}
                        >
                          {prod.isActive !== false ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBestseller(prod)}
                          className={`min-h-[44px] px-2.5 py-1 text-[11px] font-medium uppercase border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                            prod.isBestseller
                              ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                              : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                          }`}
                        >
                          {prod.isBestseller ? "Bestseller" : "Standard"}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenAiStudio
                              ? onOpenAiStudio(prod.id)
                              : setAiModalProduct(prod)
                          }
                          className="min-h-[44px] px-2.5 text-[11px] text-[#0A0A0A] border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] uppercase font-medium flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Studio</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingProduct(prod)}
                          className="min-h-[44px] px-3 text-[11px] text-[#0A0A0A] border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                        >
                          Edit
                        </button>

                        {confirmDeleteId === prod.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(prod.id)}
                              disabled={deletingId === prod.id}
                              className="min-h-[44px] px-2.5 text-[11px] bg-red-700 text-[#FFFFFF] uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                            >
                              {deletingId === prod.id ? "..." : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(prod.id)}
                            aria-label={`Delete ${prod.name}`}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-700 border border-[#E8E4DC] hover:border-red-300 hover:bg-red-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Mobile Bottom Sheet for Row Actions */}
      <AdminBottomSheet
        isOpen={Boolean(selectedProductForAction)}
        onClose={() => setSelectedProductForAction(null)}
        title={selectedProductForAction?.name || "Product Actions"}
        subtitle={
          selectedProductForAction
            ? `/${selectedProductForAction.slug} • ${currencySymbol}${selectedProductForAction.price.toFixed(2)}`
            : undefined
        }
      >
        {selectedProductForAction && (
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                const p = selectedProductForAction;
                setSelectedProductForAction(null);
                setEditingProduct(p);
              }}
              className="min-h-[44px] px-4 bg-[#0A0A0A] text-[#FFFFFF] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Specifications</span>
            </button>

            <button
              type="button"
              onClick={() => toggleIsActive(selectedProductForAction)}
              className="min-h-[44px] px-4 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              {selectedProductForAction.isActive !== false ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Hide from Storefront</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Show on Storefront</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                const p = selectedProductForAction;
                setSelectedProductForAction(null);
                setAiModalProduct(p);
              }}
              className="min-h-[44px] px-4 bg-[#FAF8F3] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open AI Studio</span>
            </button>

            <Link
              href={`/products/${selectedProductForAction.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on Storefront</span>
            </Link>

            <button
              type="button"
              onClick={() => handleDelete(selectedProductForAction.id)}
              className="min-h-[44px] px-4 bg-red-50 border border-red-300 text-red-800 font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Product</span>
            </button>
          </div>
        )}
      </AdminBottomSheet>

      {/* Create Product Modal */}
      <NewProductModal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={() => {
          fetchProducts();
          onMutated?.();
          showToast("Product created.");
        }}
      />

      {/* Edit Product Modal */}
      <ProductEditModal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        onSaved={() => {
          fetchProducts();
          onMutated?.();
          setEditingProduct(null);
          showToast("Product changes saved.");
        }}
        productToEdit={editingProduct}
      />

      {/* Row-Triggered AI Studio Modal */}
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
            showToast(`AI asset linked to ${aiModalProduct.name}`);
          }}
        />
      )}
    </div>
  );
}
