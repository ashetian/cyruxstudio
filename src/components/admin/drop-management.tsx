"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DropData } from "@/lib/drops";
import { AdminBottomSheet } from "./admin-bottom-sheet";
import {
  Plus,
  X,
  ExternalLink,
  Trash2,
  CheckCircle2,
  MoreVertical,
  Edit3,
  Check,
  AlertCircle,
} from "lucide-react";

interface ProductMinimal {
  id: string;
  name: string;
  slug: string;
  price: number;
  mediaUrls: string[];
}

export interface DropManagementProps {
  onDropMutated?: () => void;
}

export function DropManagement({ onDropMutated }: DropManagementProps = {}) {
  const [drops, setDrops] = useState<DropData[]>([]);
  const [products, setProducts] = useState<ProductMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<DropData | null>(null);
  const [selectedDropForAction, setSelectedDropForAction] = useState<DropData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    chapter: "CHAPTER 00",
    number: "01",
    slug: "",
    status: "upcoming" as "active" | "archived" | "upcoming",
    totalPieces: 100,
    bannerImage: "/assets/editorial/hero-desktop.jpg",
    releaseDateTr: "",
    releaseDateEn: "",
    editionTr: "",
    editionEn: "",
    descTr: "",
    descEn: "",
    productSlugs: [] as string[],
  });

  const fetchDrops = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/drops");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        drops?: DropData[];
        error?: string;
      };
      if (res.ok && data.success) {
        setDrops(data.drops || []);
      } else {
        setError(data.error || "Failed to load drops catalog");
      }
    } catch {
      setError("Network error fetching drops");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products?limit=100");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        products?: ProductMinimal[];
      };
      if (res.ok && data.success) {
        setProducts(data.products || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDrops();
    fetchProducts();
  }, [fetchDrops, fetchProducts]);

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const openCreateModal = () => {
    const nextNumber = String(drops.length + 1).padStart(2, "0");
    setEditingDrop(null);
    setFormData({
      title: "",
      chapter: `CHAPTER 0${Math.floor(drops.length / 2)}`,
      number: nextNumber,
      slug: "",
      status: "upcoming",
      totalPieces: 150,
      bannerImage: "/assets/editorial/hero-desktop.jpg",
      releaseDateTr: "ARALIK 2026",
      releaseDateEn: "DECEMBER 2026",
      editionTr: "150 PARÇA • NUMARALI ARŞİV DÖKÜMÜ",
      editionEn: "150 NUMBERED PIECES • ARCHIVAL RUN",
      descTr: "Kuzey Kıbrıs atölyemizde limitli üretilmiş avangart sokak giyimi serisi.",
      descEn: "Limited avant-garde streetwear run crafted at our North Cyprus atelier.",
      productSlugs: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (drop: DropData) => {
    setEditingDrop(drop);
    setFormData({
      title: drop.title,
      chapter: drop.chapter,
      number: drop.number,
      slug: drop.slug,
      status: drop.status,
      totalPieces: drop.totalPieces,
      bannerImage: drop.bannerImage,
      releaseDateTr: drop.releaseDate.tr,
      releaseDateEn: drop.releaseDate.en,
      editionTr: drop.edition.tr,
      editionEn: drop.edition.en,
      descTr: drop.description.tr,
      descEn: drop.description.en,
      productSlugs: [...drop.productSlugs],
    });
    setModalOpen(true);
  };

  const handleActivateDrop = async (id: string, title: string) => {
    setActivatingId(id);
    try {
      const res = await fetch(`/api/admin/drops/${id}/activate`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (res.ok && data.success) {
        showFeedback(`Drop "${title}" is now active.`);
        if (selectedDropForAction) {
          setSelectedDropForAction({ ...selectedDropForAction, status: "active" });
        }
        fetchDrops();
        onDropMutated?.();
      } else {
        setError(data.error || "Failed to activate drop");
      }
    } catch {
      setError("Network error activating drop");
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeleteDrop = async (id: string, title: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/drops/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (res.ok && data.success) {
        showFeedback(`Drop "${title}" removed.`);
        setConfirmDeleteId(null);
        setSelectedDropForAction(null);
        fetchDrops();
        onDropMutated?.();
      } else {
        setError(data.error || "Failed to delete drop");
      }
    } catch {
      setError("Network error deleting drop");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.number.trim() || !formData.chapter.trim()) {
      setError("Title, Number, and Chapter are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: formData.title.trim(),
      chapter: formData.chapter.trim(),
      number: formData.number.trim(),
      slug: formData.slug.trim() || undefined,
      status: formData.status,
      totalPieces: Number(formData.totalPieces) || 100,
      bannerImage: formData.bannerImage.trim(),
      releaseDate: {
        tr: formData.releaseDateTr.trim(),
        en: formData.releaseDateEn.trim(),
      },
      edition: {
        tr: formData.editionTr.trim(),
        en: formData.editionEn.trim(),
      },
      description: {
        tr: formData.descTr.trim(),
        en: formData.descEn.trim(),
      },
      productSlugs: formData.productSlugs,
    };

    try {
      const endpoint = editingDrop
        ? `/api/admin/drops/${editingDrop.id}`
        : `/api/admin/drops`;
      const method = editingDrop ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (res.ok && data.success) {
        showFeedback(editingDrop ? "Drop updated." : "New drop created.");
        setModalOpen(false);
        fetchDrops();
        onDropMutated?.();
      } else {
        setError(data.error || "Failed to save drop");
      }
    } catch {
      setError("Network error saving drop");
    } finally {
      setSaving(false);
    }
  };

  const toggleProductInDrop = (prodSlug: string) => {
    setFormData((prev) => {
      const exists = prev.productSlugs.includes(prodSlug);
      return {
        ...prev,
        productSlugs: exists
          ? prev.productSlugs.filter((s) => s !== prodSlug)
          : [...prev.productSlugs, prodSlug],
      };
    });
  };

  const activeDrop = drops.find((d) => d.status === "active");

  return (
    <div className="flex flex-col gap-5 bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Summary Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFFFF] border border-[#E8E4DC] p-4">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-xs">
          <div>
            <span className="text-[#525252] block uppercase tracking-wider text-[11px]">
              Total Drops
            </span>
            <span className="text-[#0A0A0A] font-mono font-semibold text-base md:text-lg">
              {drops.length}
            </span>
          </div>

          <div className="border-l border-[#E8E4DC] pl-4 sm:pl-6 min-w-0">
            <span className="text-[#525252] block uppercase tracking-wider text-[11px]">
              Active Drop
            </span>
            <span className="text-[#0A0A0A] font-semibold text-xs md:text-sm truncate block">
              {activeDrop ? `Drop ${activeDrop.number}: ${activeDrop.title}` : "None"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] bg-[#0A0A0A] hover:bg-[#262626] text-[#FFFFFF] font-medium uppercase tracking-wider text-xs px-5 py-2.5 cursor-pointer flex items-center justify-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
        >
          <Plus className="w-4 h-4" />
          <span>New Drop</span>
        </button>
      </div>

      {/* Navbar Latest Drop Selector */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
            Storefront Latest Drop (/drops/latest)
          </span>
          <p className="text-xs text-[#525252]">
            Select which release the storefront Latest Drop navigation points to.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
          <select
            aria-label="Select Storefront Latest Drop"
            value={activeDrop?.id || ""}
            onChange={(e) => {
              const target = drops.find((d) => d.id === e.target.value);
              if (target && target.id !== activeDrop?.id) {
                handleActivateDrop(target.id, target.title);
              }
            }}
            disabled={activatingId !== null || drops.length === 0}
            className="w-full sm:w-auto min-w-0 max-w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] text-base md:text-xs font-mono px-3.5 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                Drop {d.number} — {d.title} {d.status === "active" ? "(Active)" : ""}
              </option>
            ))}
          </select>

          <Link
            href="/drops/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 bg-[#FAF8F3] hover:border-[#0A0A0A] border border-[#E8E4DC] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <span>Preview</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Feedback Banners */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 text-xs flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{successMsg}</span>
          </span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            aria-label="Dismiss notification"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-emerald-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 text-xs flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Cards (< lg) */}
      <div className="block lg:hidden">
        {loading ? (
          <div className="p-8 text-center text-xs tracking-wider text-[#525252] uppercase bg-[#FFFFFF] border border-[#E8E4DC]">
            Loading drops...
          </div>
        ) : drops.length === 0 ? (
          <div className="p-8 text-center text-xs tracking-wider text-[#525252] uppercase bg-[#FFFFFF] border border-[#E8E4DC]">
            No drops created yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {drops.map((drop) => {
              const isActive = drop.status === "active";
              const isUpcoming = drop.status === "upcoming";

              return (
                <div
                  key={drop.id}
                  className={`bg-[#FFFFFF] border p-3.5 flex flex-col gap-2.5 ${
                    isActive ? "border-[#0A0A0A]" : "border-[#E8E4DC]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDropForAction(drop)}
                      className="min-h-[44px] flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      <div className="w-12 h-12 bg-[#FAF8F3] border border-[#E8E4DC] relative shrink-0 overflow-hidden">
                        {drop.bannerImage ? (
                          <Image
                            src={drop.bannerImage}
                            alt={drop.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-[10px] text-[#737373]">CYRUX</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] text-[#525252] uppercase tracking-wider">
                          {drop.chapter} • Drop {drop.number}
                        </span>
                        <h4 className="text-sm font-semibold text-[#0A0A0A] truncate">
                          {drop.title}
                        </h4>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium uppercase border ${
                          isActive
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : isUpcoming
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-[#F4F1EA] border-[#E8E4DC] text-[#525252]"
                        }`}
                      >
                        {drop.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDropForAction(drop)}
                        aria-label={`Actions for ${drop.title}`}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8E4DC] flex items-center justify-between text-xs text-[#525252]">
                    <span>{drop.productSlugs.length} pieces</span>
                    <span>{drop.totalPieces} edition limit</span>
                    <span className="truncate max-w-[110px]">{drop.releaseDate.en}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Drop Cards (>= lg) */}
      <div className="hidden lg:grid grid-cols-1 gap-4">
        {drops.map((drop) => {
          const isActive = drop.status === "active";
          const isUpcoming = drop.status === "upcoming";

          return (
            <div
              key={drop.id}
              className={`border bg-[#FFFFFF] flex items-stretch justify-between ${
                isActive ? "border-[#0A0A0A]" : "border-[#E8E4DC]"
              }`}
            >
              <div className="w-56 h-40 relative bg-[#FAF8F3] shrink-0 overflow-hidden border-r border-[#E8E4DC]">
                {drop.bannerImage ? (
                  <Image
                    src={drop.bannerImage}
                    alt={drop.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#737373] text-xs uppercase">
                    No Banner
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-[#FFFFFF]/95 px-2 py-0.5 text-xs font-mono border border-[#E8E4DC] uppercase text-[#0A0A0A]">
                  {drop.number}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-[#525252] uppercase">
                      {drop.chapter}
                    </span>
                    <span className="text-[#D4CFC4]">•</span>
                    <h3 className="text-base font-semibold text-[#0A0A0A] truncate">
                      {drop.title}
                    </h3>
                    <span className="text-xs text-[#737373] font-mono">
                      (/drops/{drop.slug})
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-[11px] font-medium uppercase border ${
                      isActive
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : isUpcoming
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "bg-[#F4F1EA] border-[#E8E4DC] text-[#525252]"
                    }`}
                  >
                    {drop.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs text-[#525252] bg-[#FAF8F3] p-3 border border-[#E8E4DC]">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#737373] block">
                      Release Schedule
                    </span>
                    <span className="text-[#0A0A0A] font-mono text-xs">
                      {drop.releaseDate.en}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#737373] block">
                      Edition Limit
                    </span>
                    <span className="text-[#0A0A0A] font-mono text-xs">
                      {drop.edition.en}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[#737373] block">
                      Linked Products ({drop.productSlugs.length})
                    </span>
                    <span
                      className="text-[#0A0A0A] font-mono text-xs truncate block"
                      title={drop.productSlugs.join(", ")}
                    >
                      {drop.productSlugs.length > 0
                        ? drop.productSlugs.join(", ")
                        : "None assigned"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#525252] line-clamp-1">
                  {drop.description.en || drop.description.tr || "No description provided."}
                </p>
              </div>

              <div className="p-4 bg-[#FAF8F3] border-l border-[#E8E4DC] flex flex-col justify-center items-stretch gap-2 shrink-0 w-40">
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => handleActivateDrop(drop.id, drop.title)}
                    disabled={activatingId === drop.id}
                    className="min-h-[44px] w-full bg-[#0A0A0A] hover:bg-[#262626] text-[#FFFFFF] text-xs uppercase font-medium tracking-wider px-3 py-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    {activatingId === drop.id ? "Activating..." : "Activate"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(drop)}
                  className="min-h-[44px] w-full bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] border border-[#E8E4DC] text-xs uppercase font-medium tracking-wider px-3 py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  Edit
                </button>

                <Link
                  href={`/drops/${drop.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] w-full text-center bg-[#FFFFFF] hover:border-[#0A0A0A] text-[#0A0A0A] border border-[#E8E4DC] text-xs uppercase font-medium tracking-wider px-3 py-2 flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <span>View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                {confirmDeleteId === drop.id ? (
                  <div className="flex gap-1 w-full">
                    <button
                      type="button"
                      onClick={() => handleDeleteDrop(drop.id, drop.title)}
                      disabled={deletingId === drop.id}
                      className="min-h-[44px] flex-1 bg-red-700 hover:bg-red-800 text-[#FFFFFF] text-xs uppercase font-medium px-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      {deletingId === drop.id ? "..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      aria-label="Cancel delete"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(drop.id)}
                    className="min-h-[44px] w-full text-red-700 hover:bg-red-50 border border-transparent hover:border-red-300 text-xs uppercase font-medium tracking-wider px-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Action Sheet */}
      <AdminBottomSheet
        isOpen={Boolean(selectedDropForAction)}
        onClose={() => setSelectedDropForAction(null)}
        title={selectedDropForAction?.title || "Drop Actions"}
        subtitle={
          selectedDropForAction
            ? `${selectedDropForAction.chapter} • Drop ${selectedDropForAction.number}`
            : undefined
        }
      >
        {selectedDropForAction && (
          <div className="flex flex-col gap-2.5">
            {selectedDropForAction.status !== "active" ? (
              <button
                type="button"
                onClick={() =>
                  handleActivateDrop(
                    selectedDropForAction.id,
                    selectedDropForAction.title
                  )
                }
                disabled={activatingId === selectedDropForAction.id}
                className="min-h-[44px] px-4 bg-[#0A0A0A] text-[#FFFFFF] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {activatingId === selectedDropForAction.id
                    ? "Activating..."
                    : "Set as Active Drop"}
                </span>
              </button>
            ) : (
              <div className="min-h-[44px] px-4 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-medium uppercase tracking-wider flex items-center justify-center">
                Currently Active on Storefront
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const target = selectedDropForAction;
                setSelectedDropForAction(null);
                openEditModal(target);
              }}
              className="min-h-[44px] px-4 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Drop Specification</span>
            </button>

            <Link
              href={`/drops/${selectedDropForAction.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 bg-[#FAF8F3] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Drop Page</span>
            </Link>

            {confirmDeleteId === selectedDropForAction.id ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteDrop(
                      selectedDropForAction.id,
                      selectedDropForAction.title
                    )
                  }
                  disabled={deletingId === selectedDropForAction.id}
                  className="flex-1 min-h-[44px] bg-red-700 text-[#FFFFFF] font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {deletingId === selectedDropForAction.id
                      ? "Deleting..."
                      : "Confirm Delete"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="min-h-[44px] px-4 bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] text-xs uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(selectedDropForAction.id)}
                className="min-h-[44px] px-4 bg-red-50 text-red-800 border border-red-300 font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Drop</span>
              </button>
            )}
          </div>
        )}
      </AdminBottomSheet>

      {/* Create / Edit Drop Sheet */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden"
        >
          <div className="bg-[#FFFFFF] border-t md:border border-[#E8E4DC] rounded-t-2xl md:rounded-none w-full max-w-4xl h-[92vh] md:h-auto md:max-h-[92vh] flex flex-col shadow-xl text-[#0A0A0A]">
            <div className="md:hidden pt-3 pb-1 flex justify-center bg-[#FFFFFF] shrink-0">
              <div className="w-10 h-1 bg-[#E8E4DC] rounded-full" />
            </div>

            <div className="p-4 md:p-5 border-b border-[#E8E4DC] flex items-center justify-between bg-[#FFFFFF] shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#0A0A0A] truncate">
                  {editingDrop ? `Edit Drop: ${editingDrop.title}` : "Create New Drop"}
                </h3>
                <p className="text-xs text-[#525252] mt-0.5">
                  Release metadata and linked product allocation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] bg-[#FAF8F3] text-[#0A0A0A] hover:border-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveDrop}
              className="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-xs bg-[#FAF8F3]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Chapter *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    placeholder="CHAPTER 00"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Drop Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="01"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        title: val,
                        slug: formData.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                      });
                    }}
                    placeholder="First Ascent"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "archived" | "upcoming",
                      })
                    }
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="first-ascent"
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Total Pieces
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalPieces}
                    onChange={(e) =>
                      setFormData({ ...formData, totalPieces: Number(e.target.value) || 0 })
                    }
                    className="w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase">
                    Banner Image URL *
                  </label>
                  <label className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FFFFFF] hover:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#0A0A0A] text-xs text-[#0A0A0A] uppercase font-medium cursor-pointer flex items-center gap-1.5">
                    <span>
                      {uploadingBanner ? "Uploading..." : "Upload Banner"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBanner}
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingBanner(true);
                        setError(null);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/admin/blob/upload", {
                            method: "POST",
                            body: fd,
                          });
                          const data = (await res.json().catch(() => ({}))) as {
                            success?: boolean;
                            url?: string;
                            error?: string;
                          };
                          if (res.ok && data.success && data.url) {
                            const url = data.url;
                            setFormData((prev) => ({ ...prev, bannerImage: url }));
                            showFeedback("Banner uploaded.");
                          } else {
                            setError(data.error || "Failed to upload banner image");
                          }
                        } catch {
                          setError("Network error uploading banner image");
                        } finally {
                          setUploadingBanner(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.bannerImage}
                    onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                    placeholder="/assets/editorial/hero-desktop.jpg"
                    className="flex-1 min-w-0 min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                  {formData.bannerImage && (
                    <div className="w-12 h-11 bg-[#FAF8F3] border border-[#E8E4DC] shrink-0 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.bannerImage}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FFFFFF] p-3.5 border border-[#E8E4DC]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Release Date (TR)
                  </label>
                  <input
                    type="text"
                    value={formData.releaseDateTr}
                    onChange={(e) =>
                      setFormData({ ...formData, releaseDateTr: e.target.value })
                    }
                    className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Release Date (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.releaseDateEn}
                    onChange={(e) =>
                      setFormData({ ...formData, releaseDateEn: e.target.value })
                    }
                    className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FFFFFF] p-3.5 border border-[#E8E4DC]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Edition Badge (TR)
                  </label>
                  <input
                    type="text"
                    value={formData.editionTr}
                    onChange={(e) => setFormData({ ...formData, editionTr: e.target.value })}
                    className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Edition Badge (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.editionEn}
                    onChange={(e) => setFormData({ ...formData, editionEn: e.target.value })}
                    className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] px-3.5 py-2.5 text-base md:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FFFFFF] p-3.5 border border-[#E8E4DC]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Story & Essence (TR)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.descTr}
                    onChange={(e) => setFormData({ ...formData, descTr: e.target.value })}
                    className="w-full bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] p-3 text-base md:text-xs min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#525252] uppercase mb-1">
                    Story & Essence (EN)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.descEn}
                    onChange={(e) => setFormData({ ...formData, descEn: e.target.value })}
                    className="w-full bg-[#FAF8F3] border border-[#E8E4DC] text-[#0A0A0A] p-3 text-base md:text-xs min-h-[88px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  />
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
                      Attached Pieces ({formData.productSlugs.length} selected)
                    </h4>
                    <p className="text-[11px] text-[#525252]">
                      Select products belonging to this drop
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.productSlugs.length === products.length) {
                        setFormData({ ...formData, productSlugs: [] });
                      } else {
                        setFormData({
                          ...formData,
                          productSlugs: products.map((p) => p.slug),
                        });
                      }
                    }}
                    className="min-h-[44px] px-3 border border-[#E8E4DC] bg-[#FAF8F3] text-xs text-[#0A0A0A] uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    {formData.productSlugs.length === products.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-0.5">
                  {products.map((prod) => {
                    const isSelected = formData.productSlugs.includes(prod.slug);
                    return (
                      <button
                        type="button"
                        key={prod.id}
                        onClick={() => toggleProductInDrop(prod.slug)}
                        className={`min-h-[44px] p-2.5 border text-left flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                          isSelected
                            ? "bg-[#0A0A0A] border-[#0A0A0A] text-[#FFFFFF]"
                            : "bg-[#FAF8F3] border-[#E8E4DC] text-[#0A0A0A] hover:border-[#0A0A0A]"
                        }`}
                      >
                        <div className="w-5 h-5 border border-current flex items-center justify-center shrink-0">
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        </div>
                        <div className="overflow-hidden leading-tight">
                          <span className="block text-xs font-medium truncate">
                            {prod.name}
                          </span>
                          <span className="text-[10px] font-mono opacity-75">
                            ${prod.price} • {prod.slug}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8E4DC] flex items-center justify-end gap-3 sticky bottom-0 bg-[#FFFFFF] py-3 -mx-4 md:-mx-6 px-4 md:px-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-4 text-xs uppercase tracking-wider font-medium text-[#0A0A0A] bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] flex-1 md:flex-none px-6 bg-[#0A0A0A] hover:bg-[#262626] text-[#FFFFFF] font-medium uppercase tracking-wider text-xs cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  {saving ? "Saving..." : editingDrop ? "Save Changes" : "Create Drop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
