"use client";

import React, { useState, useEffect } from "react";
import { BlobUploader } from "./blob-uploader";
import {
  X,
  Plus,
  Trash2,
  Check,
  Calculator,
  Image as ImageIcon,
} from "lucide-react";
import type { ProductItem } from "./product-catalog-table";

export interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  productToEdit?: ProductItem | null;
}

const CATEGORY_OPTIONS = [
  { value: "outerwear", label: "OUTERWEAR (Ceket/Kaban)" },
  { value: "tops", label: "TOPS & HOODIES (Tişört/Kapüşonlu)" },
  { value: "bottoms", label: "BOTTOMS (Pantolon/Kargo)" },
  { value: "tailoring", label: "TAILORING (Takım/Blazer)" },
  { value: "footwear", label: "FOOTWEAR (Ayakkabı/Bot)" },
  { value: "accessories", label: "ACCESSORIES (Aksesuar)" },
  { value: "leather", label: "LEATHER GOODS (Deri Eşya)" },
  { value: "objects", label: "OBJECTS (Objeler/Tasarım)" },
];

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
  const [color, setColor] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [twinProductSlug, setTwinProductSlug] = useState("");
  const [isDiptych, setIsDiptych] = useState(false);
  const [variants, setVariants] = useState<
    Array<{ id?: string; name?: string; size: string; stock: number; color?: string; colorHex?: string; imageUrl?: string }>
  >([
    { size: "S", stock: 5 },
    { size: "M", stock: 5 },
  ]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [manualMediaUrl, setManualMediaUrl] = useState("");
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
      setColor(productToEdit.color || "");
      setColorHex(productToEdit.colorHex || "");
      setTwinProductSlug(productToEdit.twinProductSlug || "");
      setIsDiptych(Boolean(productToEdit.isDiptych));
      setDescription(productToEdit.description || "");
      if (Array.isArray(productToEdit.variants)) {
        const cleanVars = productToEdit.variants
          .filter((v) => v && typeof v === "object" && !("_metadata" in v))
          .map((v: Record<string, unknown>, idx: number) => ({
            id: typeof v.id === "string" ? v.id : `var_${idx}`,
            name: typeof v.name === "string" ? v.name : (typeof v.size === "string" ? v.size : "M"),
            size: typeof v.size === "string" ? v.size : (typeof v.name === "string" ? v.name.replace(/^[A-Z]+\s*\/\s*/i, "") : "M"),
            stock: Number(v.stock) || 0,
            color: typeof v.color === "string" ? v.color : (typeof v.name === "string" && v.name.includes("/") ? v.name.split("/")[0].trim() : ""),
            colorHex: typeof v.colorHex === "string" ? v.colorHex : "",
            imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : "",
          }));
        if (cleanVars.length > 0) {
          setVariants(cleanVars);
        } else {
          setVariants([
            { size: "S", stock: 5 },
            { size: "M", stock: 5 },
          ]);
        }
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
      setColor("");
      setColorHex("");
      setTwinProductSlug("");
      setIsDiptych(false);
      setDescription("");
      setVariants([
        { size: "S", stock: 5 },
        { size: "M", stock: 5 },
      ]);
      setMediaUrls([]);
    }
  }, [productToEdit, isOpen]);

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit, Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const form = document.getElementById("new-product-form") as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  const updateVariant = (
    index: number,
    key: "size" | "stock" | "color" | "colorHex",
    value: string | number
  ) => {
    const next = [...variants];
    next[index] = { ...next[index], [key]: value };
    if (key === "size" || key === "color") {
      const c = key === "color" ? String(value).trim() : next[index].color;
      const s = key === "size" ? String(value).trim() : next[index].size;
      next[index].name = c ? `${c.toUpperCase()} / ${s}` : s;
    }
    setVariants(next);
  };

  const moveVariant = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= variants.length) return;
    const next = [...variants];
    const item = next[index];
    next[index] = next[target];
    next[target] = item;
    setVariants(next);
  };

  const moveMedia = (index: number, direction: "left" | "right") => {
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= mediaUrls.length) return;
    const next = [...mediaUrls];
    const item = next[index];
    next[index] = next[target];
    next[target] = item;
    setMediaUrls(next);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const applyVariantPreset = (preset: "standard" | "extended" | "onesize" | "footwear") => {
    if (preset === "standard") {
      setVariants([
        { size: "S", stock: 5 },
        { size: "M", stock: 10 },
        { size: "L", stock: 5 },
      ]);
    } else if (preset === "extended") {
      setVariants([
        { size: "XS", stock: 3 },
        { size: "S", stock: 6 },
        { size: "M", stock: 10 },
        { size: "L", stock: 8 },
        { size: "XL", stock: 4 },
      ]);
    } else if (preset === "onesize") {
      setVariants([{ size: "OS", stock: 25 }]);
    } else if (preset === "footwear") {
      setVariants([
        { size: "40", stock: 2 },
        { size: "41", stock: 4 },
        { size: "42", stock: 6 },
        { size: "43", stock: 6 },
        { size: "44", stock: 4 },
        { size: "45", stock: 2 },
      ]);
    }
  };

  const syncTotalStockWithVariants = () => {
    if (variants.length === 0) return;
    const total = variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    setStock(String(total));
  };

  const handleAddManualMedia = () => {
    if (!manualMediaUrl.trim()) return;
    setMediaUrls([...mediaUrls, manualMediaUrl.trim()]);
    setManualMediaUrl("");
  };

  const setPrimaryMedia = (index: number) => {
    if (index === 0) return;
    const selected = mediaUrls[index];
    const rest = mediaUrls.filter((_, i) => i !== index);
    setMediaUrls([selected, ...rest]);
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
          color: color.trim() || undefined,
          colorHex: colorHex.trim() || undefined,
          twinProductSlug: twinProductSlug.trim() || undefined,
          isDiptych,
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 font-mono">
      {/* 92vh Bottom Sheet on mobile / Centered Dialog on Desktop (max-w-4xl for PC monitors) */}
      <div className="relative w-full md:max-w-4xl bg-[#0E0E0E] border-t-2 md:border-2 border-white shadow-2xl h-[92vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Swipe Down Visual Cue */}
        <div className="md:hidden pt-2.5 pb-1 flex justify-center bg-[#141414] shrink-0">
          <div className="w-12 h-1 bg-[#444444] rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#222222] p-4 md:p-5 bg-[#121212] shrink-0">
          <div>
            <div className="text-[10px] tracking-widest text-[#888888] uppercase font-bold">
              {isEditing ? "PRODUCT SPECIFICATION — UPDATE" : "CATALOG REGISTRATION — NEW PIECE"}
            </div>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-[#FAF8F3] uppercase mt-0.5">
              {isEditing ? `[ EDIT: ${productToEdit?.name} ]` : "[ + NEW PRODUCT DROP ]"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-[#2E2E2E] text-[#888888] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-4 bg-red-950/80 border border-red-500 text-red-300 text-xs p-3.5 uppercase tracking-wider shrink-0 flex items-center gap-2">
            <span>[!] {error}</span>
          </div>
        )}

        {/* Form Body - Scrollable 2-Column Grid on Desktop */}
        <form
          id="new-product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 text-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ========================================================== */}
            {/* COLUMN 1: CORE PRODUCT IDENTITY & PRICING                 */}
            {/* ========================================================== */}
            <div className="flex flex-col gap-4">
              <div className="border-b border-[#1E1E1E] pb-2 text-[10px] uppercase font-bold text-[#FAF8F3] tracking-widest">
                01. CORE IDENTITY
              </div>

              {/* Product Title */}
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
                  className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3.5 py-2.5 outline-none uppercase font-bold"
                />
              </div>

              {/* URL Slug */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                    URL SLUG *
                  </label>
                  <span className="text-[10px] text-[#666] font-mono">
                    /products/{slug || "..."}
                  </span>
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEditedManually(true);
                  }}
                  placeholder="cyrux-sculptural-jacket"
                  required
                  className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3.5 py-2.5 outline-none lowercase font-mono"
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                    UNIT PRICE (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="420.00"
                    required
                    className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3.5 py-2.5 outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                    CATEGORY
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3 py-2.5 outline-none cursor-pointer uppercase font-mono"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Stock with Auto-Sync Stepper */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                    TOTAL INVENTORY STOCK *
                  </label>
                  <button
                    type="button"
                    onClick={syncTotalStockWithVariants}
                    title="Calculate total stock by summing all variant quantities"
                    className="text-[10px] text-amber-300 hover:text-white uppercase flex items-center gap-1 font-bold"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>SUM VARIANTS</span>
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="10"
                  required
                  className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3.5 py-2.5 outline-none font-mono"
                />
              </div>

              {/* Bestseller Promo Checkbox */}
              <div className="flex items-center gap-3 p-3 bg-[#141414] border border-[#282828]">
                <input
                  type="checkbox"
                  id="modalIsBestseller"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded-none cursor-pointer"
                />
                <label
                  htmlFor="modalIsBestseller"
                  className="text-xs uppercase font-bold text-[#FAF8F3] cursor-pointer tracking-wider"
                >
                  FEATURE AS ATELIER BESTSELLER (★ PROMO FLAG)
                </label>
              </div>

              {/* Colorway & Twin Pairing */}
              <div className="p-3 bg-[#141414] border border-[#282828] flex flex-col gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#AAAAAA]">
                  COLORWAY & TWIN DUALITY
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-[#888888]">COLOR NAME</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g. White or Noir"
                      className="bg-[#1C1C1C] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-2.5 py-1.5 outline-none font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-[#888888]">SWATCH HEX</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorHex && colorHex.startsWith("#") ? colorHex : "#FAF8F3"}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="w-7 h-7 bg-transparent border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        placeholder="#FAF8F3"
                        className="flex-1 bg-[#1C1C1C] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-2 py-1.5 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-[#888888]">TWIN PRODUCT SLUG (COLOR PAIRING)</label>
                  <input
                    type="text"
                    value={twinProductSlug}
                    onChange={(e) => setTwinProductSlug(e.target.value)}
                    placeholder="e.g. first-ascent-tee-black"
                    className="bg-[#1C1C1C] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-2.5 py-1.5 outline-none font-mono"
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-1 border-t border-[#222222]">
                  <input
                    type="checkbox"
                    id="modalIsDiptych"
                    checked={isDiptych}
                    onChange={(e) => setIsDiptych(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#FAF8F3] cursor-pointer"
                  />
                  <label htmlFor="modalIsDiptych" className="text-[11px] uppercase font-bold text-[#FAF8F3] cursor-pointer tracking-wider">
                    DIPTYCH ARTWORK (FRONT & BACK COMPLETION)
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase text-[#AAAAAA] font-bold tracking-wider">
                  EDITORIAL NOTES & FABRIC SPECIFICATION
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Architectural silhouette tailored in heavyweight combed cotton..."
                  className="bg-[#141414] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs p-3 outline-none resize-none font-mono"
                />
              </div>
            </div>

            {/* ========================================================== */}
            {/* COLUMN 2: VARIANT BUILDER & MEDIA ASSET VAULT            */}
            {/* ========================================================== */}
            <div className="flex flex-col gap-5">
              {/* Variant Builder */}
              <div className="flex flex-col gap-3 p-4 bg-[#121212] border border-[#222222]">
                <div className="flex items-center justify-between border-b border-[#202020] pb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#FAF8F3]">
                    02. SIZE & STOCK VARIANTS
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

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] uppercase text-[#666] font-bold">PRESETS:</span>
                  <button
                    type="button"
                    onClick={() => applyVariantPreset("standard")}
                    className="px-2 py-0.5 text-[9px] uppercase font-bold bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#AAA] hover:text-white border border-[#2E2E2E]"
                  >
                    [S, M, L]
                  </button>
                  <button
                    type="button"
                    onClick={() => applyVariantPreset("extended")}
                    className="px-2 py-0.5 text-[9px] uppercase font-bold bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#AAA] hover:text-white border border-[#2E2E2E]"
                  >
                    [XS - XL]
                  </button>
                  <button
                    type="button"
                    onClick={() => applyVariantPreset("onesize")}
                    className="px-2 py-0.5 text-[9px] uppercase font-bold bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#AAA] hover:text-white border border-[#2E2E2E]"
                  >
                    [ONE SIZE]
                  </button>
                  <button
                    type="button"
                    onClick={() => applyVariantPreset("footwear")}
                    className="px-2 py-0.5 text-[9px] uppercase font-bold bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#AAA] hover:text-white border border-[#2E2E2E]"
                  >
                    [EU 40-45]
                  </button>
                </div>

                {/* Variant Rows with Reorder Controls */}
                <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-1">
                  {variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5 p-1 bg-[#0A0A0A] border border-[#262626]">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => moveVariant(i, "up")}
                          disabled={i === 0}
                          title="Move up in order"
                          className="w-5 h-3.5 flex items-center justify-center text-[#777] hover:text-white disabled:opacity-20 cursor-pointer text-[9px] font-bold"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveVariant(i, "down")}
                          disabled={i === variants.length - 1}
                          title="Move down in order"
                          className="w-5 h-3.5 flex items-center justify-center text-[#777] hover:text-white disabled:opacity-20 cursor-pointer text-[9px] font-bold"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Index Tag */}
                      <span className="text-[9px] text-[#666] font-mono shrink-0 w-5 text-center font-bold">
                        [{String(i + 1).padStart(2, "0")}]
                      </span>

                      {/* Color (Optional) */}
                      <input
                        type="text"
                        value={v.color || ""}
                        onChange={(e) => updateVariant(i, "color", e.target.value)}
                        placeholder="COLOR (BLK/WHT)"
                        className="w-28 bg-[#141414] border border-[#2A2A2A] text-white px-2 py-1 text-xs uppercase font-mono"
                      />

                      {/* Size */}
                      <input
                        type="text"
                        value={v.size}
                        onChange={(e) => updateVariant(i, "size", e.target.value)}
                        placeholder="SIZE (S, M...)"
                        className="w-20 bg-[#141414] border border-[#2A2A2A] text-white px-2 py-1 text-xs uppercase font-mono"
                      />

                      {/* Stock */}
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value, 10) || 0)}
                        placeholder="STOCK"
                        className="w-16 bg-[#141414] border border-[#2A2A2A] text-white px-2 py-1 text-xs font-mono"
                      />

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="w-7 h-7 flex items-center justify-center text-[#666] hover:text-red-400 border border-transparent hover:border-red-900/40 ml-auto shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Media Asset Vault */}
              <div className="flex flex-col gap-3 p-4 bg-[#121212] border border-[#222222]">
                <div className="flex items-center justify-between border-b border-[#202020] pb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#FAF8F3] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    03. VISUAL ASSETS ({mediaUrls.length})
                  </span>
                  <span className="text-[9px] text-[#666] uppercase">PRIMARY = FIRST ITEM</span>
                </div>

                {/* Vercel Blob Dropzone */}
                <BlobUploader
                  compact
                  onUploadSuccess={(res) => {
                    setMediaUrls((prev) => [...prev, res.url]);
                  }}
                />

                {/* Manual Media URL Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualMediaUrl}
                    onChange={(e) => setManualMediaUrl(e.target.value)}
                    placeholder="OR PASTE DIRECT ASSET URL..."
                    className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-2.5 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualMedia}
                    disabled={!manualMediaUrl.trim()}
                    className="px-3 py-1.5 bg-[#202020] hover:bg-white text-white hover:text-black uppercase text-[10px] font-bold disabled:opacity-40"
                  >
                    ADD URL
                  </button>
                </div>

                {/* Gallery List */}
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1C1C1C]">
                    {mediaUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square bg-[#0A0A0A] border border-[#282828] group overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Asset ${idx + 1}`} className="w-full h-full object-cover" />

                        {/* Index & Primary tag */}
                        <span className="absolute top-1 left-1 bg-black/80 text-white border border-white/20 text-[8px] font-bold px-1 z-10 font-mono">
                          [{String(idx + 1).padStart(2, "0")}] {idx === 0 ? "★" : ""}
                        </span>

                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity p-1">
                          {/* Reordering Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveMedia(idx, "left")}
                              disabled={idx === 0}
                              title="Move Earlier"
                              className="px-1.5 py-0.5 bg-[#202020] hover:bg-white text-white hover:text-black text-[9px] disabled:opacity-20 border border-white/20 cursor-pointer font-bold"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => moveMedia(idx, "right")}
                              disabled={idx === mediaUrls.length - 1}
                              title="Move Later"
                              className="px-1.5 py-0.5 bg-[#202020] hover:bg-white text-white hover:text-black text-[9px] disabled:opacity-20 border border-white/20 cursor-pointer font-bold"
                            >
                              →
                            </button>
                          </div>
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => setPrimaryMedia(idx)}
                              className="text-[8px] text-white hover:underline uppercase font-bold"
                            >
                              SET PRIMARY
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="p-1 bg-red-900/80 hover:bg-red-700 text-white rounded-none cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#222222] mt-2">
            <span className="text-[10px] text-[#555] uppercase hidden sm:inline">
              PRESS <strong className="text-white">CMD / CTRL + ENTER</strong> TO SAVE
            </span>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 border border-[#333333] hover:border-white text-xs uppercase font-bold text-[#AAAAAA] hover:text-white"
              >
                [ CANCEL ]
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-6 bg-[#FAF8F3] hover:bg-white text-black text-xs uppercase font-bold tracking-wider disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <span>[ COMMITTING TO REPO... ]</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isEditing ? "[ UPDATE PIECE ]" : "[ CREATE PIECE ]"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
