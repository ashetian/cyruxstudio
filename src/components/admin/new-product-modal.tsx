"use client";

import React, { useState, useEffect } from "react";
import { BlobUploader } from "./blob-uploader";
import { X, Plus, Trash2 } from "lucide-react";
import type { ProductItem } from "./product-catalog-table";

export interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  productToEdit?: ProductItem | null;
}

export function NewProductModal({
  isOpen,
  onClose,
  onCreated,
  productToEdit,
}: NewProductModalProps) {
  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [category, setCategory] = useState("outerwear");
  const [isBestseller, setIsBestseller] = useState(false);
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<Array<{ size: string; stock: number }>>([
    { size: "S", stock: 5 },
    { size: "M", stock: 5 },
  ]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || productToEdit.title || "");
      setSlug(productToEdit.slug || "");
      setSlugEditedManually(true);
      setPrice(String(productToEdit.price || ""));
      setStock(String(productToEdit.stock ?? 10));
      setCategory(productToEdit.category || "outerwear");
      setIsBestseller(Boolean(productToEdit.isBestseller));
      setDescription(productToEdit.description || "");
      if (Array.isArray(productToEdit.variants) && productToEdit.variants.length > 0) {
        setVariants(
          productToEdit.variants.map((v) => ({
            size: v.size || v.name || "M",
            stock: Number(v.stock) || 5,
          }))
        );
      } else {
        setVariants([
          { size: "S", stock: 5 },
          { size: "M", stock: 5 },
        ]);
      }
      setMediaUrls(productToEdit.mediaUrls || productToEdit.images || []);
    } else {
      setName("");
      setSlug("");
      setSlugEditedManually(false);
      setPrice("");
      setStock("10");
      setCategory("outerwear");
      setIsBestseller(false);
      setDescription("");
      setVariants([
        { size: "S", stock: 5 },
        { size: "M", stock: 5 },
      ]);
      setMediaUrls([]);
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEditedManually && !isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { size: "L", stock: 5 }]);
  };

  const updateVariant = (index: number, key: "size" | "stock", value: string | number) => {
    const next = [...variants];
    next[index] = { ...next[index], [key]: value };
    setVariants(next);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const removeMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numericPrice = parseFloat(price);
    const numericStock = parseInt(stock, 10);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError("Please provide a valid price greater than 0");
      setLoading(false);
      return;
    }

    if (isNaN(numericStock) || numericStock < 0) {
      setError("Please provide a valid stock number (0 or higher)");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isEditing && productToEdit
        ? `/api/admin/products/${productToEdit.id}`
        : "/api/admin/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          price: numericPrice,
          stock: numericStock,
          category,
          isBestseller,
          description,
          variants,
          mediaUrls,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEditing ? "Failed to update product" : "Failed to create product"));
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 font-mono">
      {/* 92vh Bottom Sheet on mobile / Centered Dialog on Desktop */}
      <div className="relative w-full md:max-w-2xl bg-[#0E0E0E] border-t-2 md:border border-white md:border-[#2E2E2E] shadow-2xl h-[92vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Swipe Down Visual Cue */}
        <div className="md:hidden pt-2.5 pb-1 flex justify-center bg-[#141414] shrink-0">
          <div className="w-12 h-1 bg-[#444444] rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#222222] p-4 md:p-6 bg-[#121212] shrink-0">
          <div>
            <div className="text-[10px] tracking-widest text-[#888888] uppercase">
              {isEditing ? "PRODUCT SPECIFICATION // UPDATE" : "CATALOG REGISTRATION // NEW ENTRY"}
            </div>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-[#FAF8F3] uppercase mt-0.5">
              {isEditing ? `[ EDIT: ${productToEdit?.name} ]` : "[ + NEW PRODUCT DROP ]"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-[#2E2E2E] text-[#888888] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-4 bg-red-950/60 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider shrink-0">
            [!] {error}
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 text-xs">
          {/* Row 1: Title & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                PRODUCT TITLE *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="CYRUX SCULPTURAL JACKET"
                required
                className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3.5 py-3 md:py-2.5 outline-none uppercase font-bold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                URL SLUG *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEditedManually(true);
                }}
                placeholder="cyrux-sculptural-jacket"
                required
                className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3.5 py-3 md:py-2.5 outline-none lowercase font-mono"
              />
            </div>
          </div>

          {/* Row 2: Price, Stock, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                PRICE (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="420.00"
                required
                className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3.5 py-3 md:py-2.5 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                TOTAL STOCK *
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="10"
                required
                className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3.5 py-3 md:py-2.5 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3.5 py-3 md:py-2.5 outline-none cursor-pointer uppercase"
              >
                <option value="outerwear">OUTERWEAR (Ceket/Kaban)</option>
                <option value="tops">TOPS (Tişört/Hoodie)</option>
                <option value="bottoms">BOTTOMS (Pantolon/Kargo)</option>
                <option value="accessories">ACCESSORIES (Aksesuar)</option>
                <option value="footwear">FOOTWEAR (Ayakkabı)</option>
              </select>
            </div>
          </div>

          {/* Bestseller Toggle */}
          <div className="flex items-center gap-3 p-3 bg-[#121212] border border-[#222222]">
            <input
              type="checkbox"
              id="isBestseller"
              checked={isBestseller}
              onChange={(e) => setIsBestseller(e.target.checked)}
              className="w-5 h-5 accent-white rounded-none cursor-pointer"
            />
            <label
              htmlFor="isBestseller"
              className="text-xs uppercase font-bold text-[#FAF8F3] cursor-pointer tracking-wider"
            >
              FEATURE AS BESTSELLER (ÖNE ÇIKAN ÜRÜN)
            </label>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
              DESCRIPTION & ARCHIVAL NOTES
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Avant-garde silhouette crafted from heavyweight combed cotton..."
              className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs p-3 outline-none resize-none"
            />
          </div>

          {/* Variants */}
          <div className="flex flex-col gap-2 p-3.5 bg-[#121212] border border-[#222222]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#AAAAAA]">
                SIZE & STOCK VARIANTS
              </span>
              <button
                type="button"
                onClick={addVariant}
                className="text-[10px] text-white hover:underline flex items-center gap-1 uppercase font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD SIZE</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v.size}
                    onChange={(e) => updateVariant(i, "size", e.target.value)}
                    placeholder="SIZE (S, M, L...)"
                    className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-xs uppercase"
                  />
                  <input
                    type="number"
                    min="0"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value, 10) || 0)}
                    placeholder="QTY"
                    className="w-20 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-xs"
                  />
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="w-9 h-9 flex items-center justify-center border border-red-900/40 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Media Assets Uploader */}
          <div className="flex flex-col gap-2 p-3.5 bg-[#121212] border border-[#222222]">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#AAAAAA]">
              MEDIA ASSETS (VERCEL BLOB / CLOUD)
            </span>
            <BlobUploader
              onUploadSuccess={(result) => setMediaUrls((prev) => [...prev, typeof result === "string" ? result : result.url])}
            />

            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square bg-[#080808] border border-[#2A2A2A] overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Asset ${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 bg-black/80 text-red-400 p-1 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Bottom Form Action Bar */}
          <div className="pt-4 border-t border-[#222222] flex items-center justify-end gap-3 sticky bottom-0 bg-[#0E0E0E] py-3 -mx-4 md:-mx-6 px-4 md:px-6">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 text-xs uppercase font-mono tracking-wider text-[#888888] hover:text-white border border-[#2E2E2E]"
            >
              [CANCEL]
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex-1 md:flex-none px-6 bg-[#FAF8F3] hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-none cursor-pointer disabled:opacity-50"
            >
              {loading ? "[COMMITTING...]" : isEditing ? "[UPDATE PRODUCT]" : "[PUBLISH PRODUCT]"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
