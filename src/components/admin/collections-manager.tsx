"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminBottomSheet } from "./admin-bottom-sheet";
import { BlobUploader } from "./blob-uploader";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export interface CollectionsManagerProps {
  onMutated?: () => void;
}

interface CollectionRecord {
  id: string;
  slug: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProductSummary {
  id: string;
  name: string;
  slug: string;
}

export function CollectionsManager({ onMutated }: CollectionsManagerProps) {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "featured" | "active">("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [nameEn, setNameEn] = useState("");
  const [nameTr, setNameTr] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [descEn, setDescEn] = useState("");
  const [descTr, setDescTr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [colRes, prodRes] = await Promise.all([
        fetch("/api/admin/collections?limit=100"),
        fetch("/api/admin/products?limit=100"),
      ]);
      const colData = (await colRes.json().catch(() => ({}))) as {
        success?: boolean;
        collections?: CollectionRecord[];
        error?: string;
      };
      const prodData = (await prodRes.json().catch(() => ({}))) as {
        success?: boolean;
        products?: ProductSummary[];
      };

      if (colRes.ok && colData.success) {
        setCollections(colData.collections || []);
      } else {
        setError(colData.error || "Failed to load collections");
      }

      if (prodRes.ok && prodData.success && Array.isArray(prodData.products)) {
        setProducts(prodData.products);
      }
    } catch {
      setError("Network error loading collections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditing(null);
    setNameEn("");
    setNameTr("");
    setSlug("");
    setSlugEdited(false);
    setDescEn("");
    setDescTr("");
    setImageUrl("");
    setSortOrder(String(collections.length));
    setIsFeatured(false);
    setIsActive(true);
    setSelectedProductIds([]);
    setConfirmDelete(false);
    setFormError(null);
    setSheetOpen(true);
  };

  const openEdit = (col: CollectionRecord) => {
    setEditing(col);
    setNameEn(col.name?.en || "");
    setNameTr(col.name?.tr || "");
    setSlug(col.slug || "");
    setSlugEdited(true);
    setDescEn(col.description?.en || "");
    setDescTr(col.description?.tr || "");
    setImageUrl(col.imageUrl || "");
    setSortOrder(String(col.sortOrder ?? 0));
    setIsFeatured(Boolean(col.isFeatured));
    setIsActive(col.isActive !== false);
    setSelectedProductIds(Array.isArray(col.productIds) ? [...col.productIds] : []);
    setConfirmDelete(false);
    setFormError(null);
    setSheetOpen(true);
  };

  const toggleProductId = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nameEn.trim() && !nameTr.trim()) {
      setFormError("Collection name is required.");
      return;
    }

    const cleanSlug = (slug.trim() || nameEn.trim() || nameTr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      setFormError("Slug must contain only lowercase letters, numbers, and hyphens.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editing
        ? `/api/admin/collections/${editing.id}`
        : "/api/admin/collections";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: cleanSlug,
          name: {
            en: (nameEn.trim() || nameTr.trim()).trim(),
            tr: (nameTr.trim() || nameEn.trim()).trim(),
          },
          description: {
            en: descEn.trim(),
            tr: descTr.trim(),
          },
          imageUrl: imageUrl.trim(),
          isFeatured,
          isActive,
          sortOrder: Math.max(0, parseInt(sortOrder, 10) || 0),
          productIds: selectedProductIds,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save collection");
      }

      setSheetOpen(false);
      await fetchAll();
      onMutated?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save collection");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/collections/${editing.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete collection");
      }
      setSheetOpen(false);
      await fetchAll();
      onMutated?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setDeleting(false);
    }
  };

  const toggleFeaturedQuick = async (col: CollectionRecord) => {
    try {
      const res = await fetch(`/api/admin/collections/${col.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !col.isFeatured }),
      });
      if (res.ok) {
        await fetchAll();
        onMutated?.();
      }
    } catch {
      // ignore
    }
  };

  const filtered = collections.filter((col) => {
    if (filterMode === "featured" && !col.isFeatured) return false;
    if (filterMode === "active" && !col.isActive) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      return (
        col.slug.toLowerCase().includes(term) ||
        col.name.en.toLowerCase().includes(term) ||
        col.name.tr.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5 bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Toolbar */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#0A0A0A]">
              Collections ({collections.length})
            </h2>
            <p className="text-xs text-[#525252]">
              Curate seasonal groupings and link products.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAll}
              aria-label="Refresh collections"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="min-h-[44px] px-4 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs font-medium uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <Plus className="w-4 h-4" />
              <span>New Collection</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#E8E4DC]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: "all", label: "All" },
                { id: "featured", label: "Featured" },
                { id: "active", label: "Active" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id)}
                className={`min-h-[44px] px-3.5 text-xs font-medium uppercase tracking-wider border whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  filterMode === f.id
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collections..."
              aria-label="Search collections"
              className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs pl-9 pr-9 py-2.5 placeholder:text-[#737373]"
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
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs uppercase tracking-wider text-[#525252] bg-[#FFFFFF] border border-[#E8E4DC]">
          Loading collections...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs uppercase tracking-wider text-[#525252] bg-[#FFFFFF] border border-[#E8E4DC]">
          No collections found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((col) => (
            <div
              key={col.id}
              className="bg-[#FFFFFF] border border-[#E8E4DC] flex flex-col justify-between min-w-0"
            >
              <div>
                <div className="aspect-[4/3] bg-[#FAF8F3] border-b border-[#E8E4DC] relative overflow-hidden flex items-center justify-center">
                  {col.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={col.imageUrl}
                      alt={col.name.en || col.name.tr}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-mono text-[#737373]">NO COVER</span>
                  )}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                    {col.isFeatured && (
                      <span className="px-2 py-0.5 bg-[#0A0A0A] text-[#FFFFFF] text-[10px] font-medium uppercase tracking-wider">
                        Featured
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border ${
                        col.isActive
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-[#F4F1EA] border-[#E8E4DC] text-[#525252]"
                      }`}
                    >
                      {col.isActive ? "Active" : "Hidden"}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-1.5 min-w-0">
                  <h3 className="text-sm font-semibold text-[#0A0A0A] truncate">
                    {col.name.en || col.name.tr}
                  </h3>
                  <div className="text-xs font-mono text-[#525252] truncate">
                    /{col.slug} • {col.productCount} products • Order {col.sortOrder}
                  </div>
                  {(col.description.en || col.description.tr) && (
                    <p className="text-xs text-[#525252] line-clamp-2 mt-1">
                      {col.description.en || col.description.tr}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-[#E8E4DC] bg-[#FAF8F3] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(col)}
                  className="flex-1 min-h-[44px] px-3 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-xs font-medium uppercase tracking-wider text-[#0A0A0A] inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFeaturedQuick(col)}
                  className="min-h-[44px] px-3 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-xs font-medium uppercase tracking-wider text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  {col.isFeatured ? "Unfeature" : "Feature"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Bottom Sheet */}
      <AdminBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? `Edit ${editing.name.en || editing.name.tr}` : "New Collection"}
        subtitle={editing ? `/${editing.slug}` : "Create a curated product collection"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
          {formError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-300 text-red-900 text-xs p-3 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-[#525252]">
                Name (EN) *
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => {
                  const v = e.target.value;
                  setNameEn(v);
                  if (!slugEdited && !editing) {
                    setSlug(
                      v
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "")
                    );
                  }
                }}
                required
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-[#525252]">
                Name (TR)
              </label>
              <input
                type="text"
                value={nameTr}
                onChange={(e) => setNameTr(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-[#525252]">
                Slug *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                required
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono lowercase"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-[#525252]">
                Sort Order
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-[#525252]">
                Description (EN)
              </label>
              <textarea
                rows={3}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[84px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-[#525252]">
                Description (TR)
              </label>
              <textarea
                rows={3}
                value={descTr}
                onChange={(e) => setDescTr(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3 min-h-[84px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase text-[#525252]">
              Cover Image
            </label>
            <BlobUploader compact onUploadSuccess={(res) => setImageUrl(res.url)} />
            <input
              type="text"
              maxLength={500}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono placeholder:text-[#737373]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="min-h-[44px] flex items-center gap-3 px-3 py-2 bg-[#FAF8F3] border border-[#E8E4DC] cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-[#0A0A0A] cursor-pointer"
              />
              <span className="text-xs font-medium text-[#0A0A0A]">Featured Collection</span>
            </label>

            <label className="min-h-[44px] flex items-center gap-3 px-3 py-2 bg-[#FAF8F3] border border-[#E8E4DC] cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-[#0A0A0A] cursor-pointer"
              />
              <span className="text-xs font-medium text-[#0A0A0A]">Active on Storefront</span>
            </label>
          </div>

          {/* Linked Products */}
          <div className="flex flex-col gap-2 bg-[#FAF8F3] border border-[#E8E4DC] p-3">
            <span className="text-[11px] font-semibold uppercase text-[#525252]">
              Linked Products ({selectedProductIds.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {products.map((prod) => {
                const selected = selectedProductIds.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => toggleProductId(prod.id)}
                    className={`min-h-[44px] px-3 py-2 border text-left flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                      selected
                        ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                        : "bg-[#FFFFFF] text-[#0A0A0A] border-[#E8E4DC]"
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        selected ? "opacity-100" : "opacity-20"
                      }`}
                    />
                    <span className="text-xs truncate">{prod.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E4DC]">
            {editing && (
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDelete}
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
                {saving ? "Saving..." : editing ? "Save Collection" : "Create Collection"}
              </button>
            </div>
          </div>
        </form>
      </AdminBottomSheet>
    </div>
  );
}
