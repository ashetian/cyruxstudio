"use client";

import React, { useState } from "react";
import { BlobUploader } from "./blob-uploader";

export interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewProductModal({
  isOpen,
  onClose,
  onCreated,
}: NewProductModalProps) {
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

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEditedManually) {
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
    setError(null);
    setLoading(true);

    const numericPrice = parseFloat(price);
    const numericStock = parseInt(stock, 10);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
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
        throw new Error(data.error || "Failed to create product");
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="relative w-full max-w-2xl bg-[#121212] border border-[#2E2E2E] shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-6">
          <div>
            <div className="text-[11px] tracking-widest text-[#888888] uppercase">
              CATALOG REGISTRATION
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[#FAF8F3] uppercase">
              [ + NEW PRODUCT DROP ]
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-sm font-bold text-[#888888] hover:text-[#FAF8F3] uppercase"
          >
            [✕ CLOSE]
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider">
            [!] {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                PRODUCT TITLE *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="CYRUX SCULPTURAL JACKET"
                required
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-sm px-3.5 py-2.5 rounded-none uppercase outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
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
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-sm px-3.5 py-2.5 rounded-none outline-none lowercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                PRICE *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="420.00"
                required
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-sm px-3.5 py-2.5 rounded-none outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                INITIAL STOCK *
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="25"
                required
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-sm px-3.5 py-2.5 rounded-none outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-sm px-3.5 py-2.5 rounded-none outline-none uppercase"
              >
                <option value="outerwear">OUTERWEAR</option>
                <option value="hoodies">HOODIES</option>
                <option value="t-shirts">T-SHIRTS</option>
                <option value="pants">PANTS</option>
                <option value="accessories">ACCESSORIES</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              id="modal-bestseller"
              checked={isBestseller}
              onChange={(e) => setIsBestseller(e.target.checked)}
              className="w-4 h-4 rounded-none accent-[#FAF8F3] cursor-pointer"
            />
            <label
              htmlFor="modal-bestseller"
              className="text-xs uppercase text-[#FAF8F3] font-bold tracking-wider cursor-pointer"
            >
              PROMOTE TO BESTSELLER GRID
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
              EDITORIAL DESCRIPTION
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tailored brutalist silhouette garment..."
              className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-sm px-3.5 py-2.5 rounded-none outline-none"
            />
          </div>

          {/* Variants section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#222222]">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                SIZE VARIANTS
              </label>
              <button
                type="button"
                onClick={addVariant}
                className="text-[11px] text-[#FAF8F3] hover:underline uppercase"
              >
                [+ ADD VARIANT]
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v.size}
                    onChange={(e) => updateVariant(idx, "size", e.target.value)}
                    placeholder="Size (e.g. M)"
                    className="w-1/2 bg-[#0A0A0A] border border-[#2E2E2E] text-xs px-3 py-2 text-[#FAF8F3] rounded-none outline-none uppercase"
                  />
                  <input
                    type="number"
                    min="0"
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, "stock", parseInt(e.target.value || "0", 10))}
                    placeholder="Stock"
                    className="w-1/2 bg-[#0A0A0A] border border-[#2E2E2E] text-xs px-3 py-2 text-[#FAF8F3] rounded-none outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="text-xs text-red-400 hover:text-red-300 px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Image Upload section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#222222]">
            <label className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
              MEDIA ASSETS (VERCEL BLOB)
            </label>
            <BlobUploader
              compact
              onUploadSuccess={(res) => setMediaUrls([...mediaUrls, res.url])}
            />

            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {mediaUrls.map((url, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-[#0A0A0A] border border-[#2E2E2E] p-1.5 text-[11px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="asset preview" className="w-8 h-8 object-cover" />
                    <span className="truncate max-w-[140px] text-[#888888]">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="text-red-400 hover:text-red-300 px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-[#333333] hover:border-[#666666] text-[#888888] hover:text-[#FAF8F3] text-xs uppercase tracking-wider rounded-none"
            >
              [ DISCARD ]
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#FAF8F3] text-[#0A0A0A] hover:bg-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer disabled:opacity-50"
            >
              {loading ? "[ CREATING DROP... ]" : "[ CREATE PRODUCT DROP → ]"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
