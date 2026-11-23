"use client";

import React, { useState, useEffect } from "react";
import { BlobUploader } from "./blob-uploader";
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import type { ProductItem } from "./product-catalog-table";

export interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  productToEdit?: ProductItem | null;
}

interface CollectionOption {
  id: string;
  slug: string;
  name: { tr: string; en: string };
}

interface VariantFormRow {
  id?: string;
  name?: string;
  size: string;
  stock: number;
  inStock?: boolean;
  sku?: string;
  priceModifier?: number;
  color?: string;
  colorHex?: string;
  imageUrl?: string;
}

const CATEGORY_OPTIONS = [
  { value: "outerwear", label: "Outerwear" },
  { value: "tops", label: "Tops & Hoodies" },
  { value: "bottoms", label: "Bottoms & Cargo" },
  { value: "tailoring", label: "Tailoring" },
  { value: "footwear", label: "Footwear" },
  { value: "accessories", label: "Accessories" },
  { value: "leather", label: "Leather Goods" },
  { value: "objects", label: "Objects" },
];

const BADGE_PRESETS = ["", "BESTSELLER", "LIMITED", "NEW", "ARCHIVE"] as const;

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
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [category, setCategory] = useState("outerwear");
  const [collectionId, setCollectionId] = useState("");
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [badge, setBadge] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [sku, setSku] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [twinProductSlug, setTwinProductSlug] = useState("");
  const [isDiptych, setIsDiptych] = useState(false);
  const [variants, setVariants] = useState<VariantFormRow[]>([
    { size: "S", stock: 5 },
    { size: "M", stock: 5 },
  ]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [manualMediaUrl, setManualMediaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch("/api/admin/collections?limit=100")
      .then((res) => res.json().catch(() => ({})))
      .then((data: { success?: boolean; collections?: CollectionOption[] }) => {
        if (active && data.success && Array.isArray(data.collections)) {
          setCollections(data.collections);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    setError(null);
    if (productToEdit) {
      setName(productToEdit.name || productToEdit.title || "");
      setSlug(productToEdit.slug || "");
      setSlugEditedManually(true);
      setPrice(String(productToEdit.price || ""));
      setDiscountPrice(
        productToEdit.discountPrice != null ? String(productToEdit.discountPrice) : ""
      );
      setStock(String(productToEdit.stock ?? 10));
      setCategory(productToEdit.category || "outerwear");
      setCollectionId(productToEdit.collectionId || "");
      setBadge(productToEdit.badge || "");
      setSortOrder(String(productToEdit.sortOrder ?? 0));
      setSku(productToEdit.sku || "");
      setIsActive(productToEdit.isActive !== false);
      setIsBestseller(Boolean(productToEdit.isBestseller));
      setColor(productToEdit.color || "");
      setColorHex(productToEdit.colorHex || "");
      setTwinProductSlug(productToEdit.twinProductSlug || "");
      setIsDiptych(Boolean(productToEdit.isDiptych));
      setDescription(productToEdit.description || "");
      if (Array.isArray(productToEdit.variants)) {
        const cleanVars = productToEdit.variants
          .filter((v) => v && typeof v === "object" && !("_metadata" in v))
          .map((v: Record<string, unknown>, idx: number) => {
            const parsedStock =
              typeof v.stock === "number" && Number.isFinite(v.stock)
                ? Math.max(0, Math.floor(v.stock))
                : v.inStock === false
                ? 0
                : 1;
            const resolvedInStock =
              typeof v.inStock === "boolean" ? v.inStock : parsedStock > 0;
            return {
              id: typeof v.id === "string" ? v.id : `var_${idx}`,
              name:
                typeof v.name === "string"
                  ? v.name
                  : typeof v.size === "string"
                  ? v.size
                  : "M",
              size:
                typeof v.size === "string"
                  ? v.size
                  : typeof v.name === "string"
                  ? v.name.replace(/^[A-Z]+\s*\/\s*/i, "")
                  : "M",
              stock: parsedStock,
              inStock: resolvedInStock,
              sku: typeof v.sku === "string" ? v.sku : undefined,
              priceModifier:
                typeof v.priceModifier === "number" && Number.isFinite(v.priceModifier)
                  ? v.priceModifier
                  : undefined,
              color:
                typeof v.color === "string"
                  ? v.color
                  : typeof v.name === "string" && v.name.includes("/")
                  ? v.name.split("/")[0].trim()
                  : "",
              colorHex: typeof v.colorHex === "string" ? v.colorHex : "",
              imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : "",
            };
          });
        setVariants(
          cleanVars.length > 0
            ? cleanVars
            : [
                { size: "S", stock: 5 },
                { size: "M", stock: 5 },
              ]
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
      setDiscountPrice("");
      setStock("10");
      setCategory("outerwear");
      setCollectionId("");
      setBadge("");
      setSortOrder("0");
      setSku("");
      setIsActive(true);
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
      const c = key === "color" ? String(value).trim() : (next[index].color || "").trim();
      const s = key === "size" ? String(value).trim() : next[index].size.trim();
      next[index].name = c ? `${c.toUpperCase()} / ${s}` : s;
    } else if (key === "stock") {
      next[index].inStock = Math.max(0, Math.floor(Number(value) || 0)) > 0;
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
    const numericDiscount = discountPrice.trim() ? parseFloat(discountPrice) : null;
    const numericSortOrder = Math.max(0, parseInt(sortOrder, 10) || 0);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError("Please provide a valid unit price greater than 0.");
      setLoading(false);
      return;
    }

    if (numericDiscount !== null) {
      if (isNaN(numericDiscount) || numericDiscount <= 0 || numericDiscount >= numericPrice) {
        setError("Discount price must be greater than 0 and less than unit price.");
        setLoading(false);
        return;
      }
    }

    if (isNaN(numericStock) || numericStock < 0) {
      setError("Please provide a valid stock number (0 or higher).");
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        isEditing && productToEdit
          ? `/api/admin/products/${productToEdit.id}`
          : "/api/admin/products";
      const method = isEditing ? "PATCH" : "POST";

      const normalizedVariants = variants.map((v, idx) => {
        const trimmedSize = v.size.trim();
        const trimmedColor = v.color?.trim() || "";
        const trimmedColorHex = v.colorHex?.trim() || "";
        const trimmedImageUrl = v.imageUrl?.trim() || "";
        const cleanStock = Math.max(0, Math.floor(Number(v.stock) || 0));
        const resolvedName = trimmedColor
          ? trimmedSize
            ? `${trimmedColor.toUpperCase()} / ${trimmedSize}`
            : trimmedColor.toUpperCase()
          : trimmedSize || v.name?.trim() || "OS";
        return {
          id: v.id || `var_${idx}`,
          name: resolvedName,
          size: trimmedSize || resolvedName,
          stock: cleanStock,
          inStock: cleanStock > 0,
          ...(trimmedColor ? { color: trimmedColor } : {}),
          ...(trimmedColorHex ? { colorHex: trimmedColorHex } : {}),
          ...(trimmedImageUrl ? { imageUrl: trimmedImageUrl } : {}),
          ...(v.sku ? { sku: v.sku } : {}),
          ...(v.priceModifier !== undefined ? { priceModifier: v.priceModifier } : {}),
        };
      });

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          price: numericPrice,
          discountPrice: numericDiscount,
          stock: numericStock,
          category,
          collectionId: collectionId.trim() ? collectionId.trim() : null,
          badge: badge.trim() ? badge.trim().toUpperCase() : null,
          sortOrder: numericSortOrder,
          sku: sku.trim() ? sku.trim() : null,
          isActive,
          isBestseller,
          color: color.trim() || null,
          colorHex: colorHex.trim() || null,
          twinProductSlug: twinProductSlug.trim() || null,
          isDiptych,
          description,
          variants: normalizedVariants,
          mediaUrls,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || (isEditing ? "Failed to update product" : "Failed to create product")
        );
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <div className="relative w-full md:max-w-4xl bg-[#FFFFFF] text-[#0A0A0A] border-t md:border border-[#E8E4DC] rounded-t-2xl md:rounded-none shadow-xl h-[92vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Grab Cue */}
        <div className="md:hidden pt-3 pb-1 flex justify-center bg-[#FFFFFF] shrink-0">
          <div className="w-10 h-1 bg-[#E8E4DC] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E4DC] px-4 py-3.5 md:px-6 md:py-4 bg-[#FFFFFF] shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] tracking-wider text-[#525252] uppercase font-medium">
              {isEditing ? "Update Garment Specification" : "New Garment"}
            </div>
            <h2 className="text-base md:text-lg font-semibold tracking-tight text-[#0A0A0A] truncate mt-0.5">
              {isEditing ? productToEdit?.name : "Create Product"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A] hover:border-[#0A0A0A] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 mt-4 bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 shrink-0 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          id="new-product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 text-xs bg-[#FAF8F3]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Core Identity & Pricing */}
            <div className="flex flex-col gap-4 bg-[#FFFFFF] border border-[#E8E4DC] p-4 min-w-0">
              <div className="border-b border-[#E8E4DC] pb-2 text-xs uppercase font-semibold text-[#0A0A0A] tracking-wider">
                1. Identity & Pricing
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Cyrux Sculptural Jacket"
                  required
                  className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 placeholder:text-[#737373]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                    URL Slug *
                  </label>
                  <span className="text-[11px] text-[#737373] font-mono truncate">
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
                  className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 lowercase font-mono placeholder:text-[#737373]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="420.00"
                    required
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                    Discount Price
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 font-mono placeholder:text-[#737373]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2.5 cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                    Collection
                  </label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2.5 cursor-pointer"
                  >
                    <option value="">No collection</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name.en || col.name.tr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Badge & Presets */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                  Badge Label
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BADGE_PRESETS.map((preset) => {
                    const active = badge.toUpperCase() === preset;
                    return (
                      <button
                        key={preset || "none"}
                        type="button"
                        onClick={() => setBadge(preset)}
                        className={`min-h-[44px] px-3 text-[11px] uppercase font-medium border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                          active
                            ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                            : "bg-[#FAF8F3] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A]"
                        }`}
                      >
                        {preset || "None"}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  maxLength={40}
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Custom badge (e.g. EDITION 01)"
                  className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 uppercase font-mono placeholder:text-[#737373]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                      Total Stock *
                    </label>
                    <button
                      type="button"
                      onClick={syncTotalStockWithVariants}
                      className="min-h-[44px] px-2 text-[11px] text-[#0A0A0A] hover:underline uppercase flex items-center gap-1 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Sum</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5 justify-end">
                  <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5 justify-end">
                  <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="CYR-001"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3.5 py-2.5 font-mono placeholder:text-[#737373]"
                  />
                </div>
              </div>

              {/* Active & Bestseller Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="min-h-[44px] flex items-center gap-3 px-3 py-2 bg-[#FAF8F3] border border-[#E8E4DC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#0A0A0A] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-[#0A0A0A]">
                    Visible on Storefront
                  </span>
                </label>

                <label className="min-h-[44px] flex items-center gap-3 px-3 py-2 bg-[#FAF8F3] border border-[#E8E4DC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="w-4 h-4 accent-[#0A0A0A] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-[#0A0A0A]">
                    Feature as Bestseller
                  </span>
                </label>
              </div>

              {/* Colorway & Twin */}
              <div className="p-3.5 bg-[#FAF8F3] border border-[#E8E4DC] flex flex-col gap-3">
                <span className="text-[11px] uppercase font-semibold tracking-wider text-[#525252]">
                  Colorway & Twin Pairing
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase text-[#525252]">Color Name</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Bone or Noir"
                      className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase text-[#525252]">Swatch Hex</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorHex && colorHex.startsWith("#") ? colorHex : "#FAF8F3"}
                        onChange={(e) => setColorHex(e.target.value)}
                        aria-label="Color swatch picker"
                        className="w-11 h-11 bg-[#FFFFFF] border border-[#E8E4DC] cursor-pointer p-1 shrink-0"
                      />
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        placeholder="#FAF8F3"
                        className="flex-1 min-w-0 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase text-[#525252]">
                    Twin Product Slug
                  </label>
                  <input
                    type="text"
                    value={twinProductSlug}
                    onChange={(e) => setTwinProductSlug(e.target.value)}
                    placeholder="first-ascent-tee-black"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2 font-mono"
                  />
                </div>

                <label className="min-h-[44px] flex items-center gap-2.5 pt-1 border-t border-[#E8E4DC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDiptych}
                    onChange={(e) => setIsDiptych(e.target.checked)}
                    className="w-4 h-4 accent-[#0A0A0A] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-[#0A0A0A]">
                    Diptych Artwork (Front & Back Completion)
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase text-[#525252] font-semibold tracking-wider">
                  Fabric & Editorial Notes
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Architectural silhouette tailored in heavyweight combed cotton..."
                  className="w-full bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3 resize-y min-h-[96px] placeholder:text-[#737373]"
                />
              </div>
            </div>

            {/* Column 2: Variants & Media */}
            <div className="flex flex-col gap-5 min-w-0">
              {/* Variant Builder */}
              <div className="flex flex-col gap-3 p-4 bg-[#FFFFFF] border border-[#E8E4DC]">
                <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2 gap-2">
                  <span className="text-xs uppercase font-semibold tracking-wider text-[#0A0A0A]">
                    2. Size & Stock Variants
                  </span>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-[#0A0A0A] flex items-center gap-1.5 text-xs uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Size</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] uppercase text-[#525252] font-medium mr-1">
                    Presets:
                  </span>
                  {(
                    [
                      { id: "standard", label: "S / M / L" },
                      { id: "extended", label: "XS - XL" },
                      { id: "onesize", label: "One Size" },
                      { id: "footwear", label: "EU 40-45" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyVariantPreset(p.id)}
                      className="min-h-[44px] px-3 text-[11px] uppercase font-medium bg-[#FAF8F3] hover:bg-[#F4F1EA] text-[#0A0A0A] border border-[#E8E4DC] hover:border-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-0.5">
                  {variants.map((v, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 p-2.5 bg-[#FAF8F3] border border-[#E8E4DC] min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono font-semibold text-[#525252] mr-1">
                            [{String(i + 1).padStart(2, "0")}]
                          </span>
                          <button
                            type="button"
                            onClick={() => moveVariant(i, "up")}
                            disabled={i === 0}
                            aria-label="Move variant up"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveVariant(i, "down")}
                            disabled={i === variants.length - 1}
                            aria-label="Move variant down"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          aria-label="Remove variant"
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-red-700 hover:border-red-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                        <input
                          type="text"
                          value={v.color || ""}
                          onChange={(e) => updateVariant(i, "color", e.target.value)}
                          placeholder="Color"
                          className="w-full min-w-0 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] px-2.5 py-2 text-base md:text-xs"
                        />
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) => updateVariant(i, "size", e.target.value)}
                          placeholder="Size"
                          className="w-full min-w-0 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] px-2.5 py-2 text-base md:text-xs uppercase font-mono"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={v.stock}
                          onChange={(e) =>
                            updateVariant(i, "stock", parseInt(e.target.value, 10) || 0)
                          }
                          placeholder="Stock"
                          className="w-full min-w-0 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] px-2.5 py-2 text-base md:text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Media Gallery */}
              <div className="flex flex-col gap-3 p-4 bg-[#FFFFFF] border border-[#E8E4DC]">
                <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-2 gap-2">
                  <span className="text-xs uppercase font-semibold tracking-wider text-[#0A0A0A] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    <span>3. Visual Assets ({mediaUrls.length})</span>
                  </span>
                  <span className="text-[11px] text-[#525252]">First = Primary</span>
                </div>

                <BlobUploader
                  compact
                  onUploadSuccess={(res) => {
                    setMediaUrls((prev) => [...prev, res.url]);
                  }}
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={manualMediaUrl}
                    onChange={(e) => setManualMediaUrl(e.target.value)}
                    placeholder="Paste direct asset URL..."
                    className="flex-1 min-w-0 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] px-3 py-2 text-base md:text-xs font-mono placeholder:text-[#737373]"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualMedia}
                    disabled={!manualMediaUrl.trim()}
                    className="min-h-[44px] px-4 bg-[#FAF8F3] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] uppercase text-xs font-medium disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Add URL
                  </button>
                </div>

                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E8E4DC]">
                    {mediaUrls.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="bg-[#FFFFFF] border border-[#E8E4DC] flex flex-col overflow-hidden"
                      >
                        <div className="relative aspect-square bg-[#FAF8F3]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Asset ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1.5 left-1.5 bg-[#FFFFFF]/95 border border-[#E8E4DC] text-[#0A0A0A] text-[10px] font-mono font-semibold px-1.5 py-0.5">
                            [{String(idx + 1).padStart(2, "0")}]
                            {idx === 0 ? " Primary" : ""}
                          </span>
                        </div>

                        <div className="p-1.5 flex flex-wrap items-center gap-1 border-t border-[#E8E4DC] bg-[#FAF8F3]">
                          <button
                            type="button"
                            onClick={() => moveMedia(idx, "left")}
                            disabled={idx === 0}
                            aria-label="Move image earlier"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] hover:border-[#0A0A0A] disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMedia(idx, "right")}
                            disabled={idx === mediaUrls.length - 1}
                            aria-label="Move image later"
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] hover:border-[#0A0A0A] disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            aria-label="Delete image"
                            className="min-w-[44px] min-h-[44px] ml-auto flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-red-700 hover:border-red-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => setPrimaryMedia(idx)}
                              className="w-full min-h-[44px] px-2 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[11px] font-medium uppercase text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                            >
                              Set Primary
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E8E4DC]">
            <span className="text-[11px] text-[#525252] hidden sm:inline">
              Press Cmd/Ctrl + Enter to save
            </span>

            <div className="flex items-center gap-3 ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none min-h-[44px] px-5 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-xs uppercase font-medium text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none min-h-[44px] px-6 bg-[#0A0A0A] hover:bg-[#262626] text-[#FFFFFF] text-xs uppercase font-medium tracking-wider disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
