"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DropData } from "@/lib/drops";
import { Plus, X, ExternalLink, Trash2, CheckCircle2, MoreVertical, Edit3, Check } from "lucide-react";

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

  // Modal & Action Sheet states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<DropData | null>(null);
  const [selectedDropForAction, setSelectedDropForAction] = useState<DropData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states
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
      const data = await res.json().catch(() => ({}));
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
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.warn("Could not load products for selector:", e);
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
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showFeedback(`DROP [${title}] IS NOW ACTIVE`);
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
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showFeedback(`DROP [${title}] REMOVED FROM SYSTEM`);
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
      setError("Title, Number and Chapter are strictly required");
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

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        showFeedback(editingDrop ? "DROP UPDATED SUCCESSFULLY" : "NEW DROP INITIALIZED");
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

  const toggleProductInDrop = (slug: string) => {
    setFormData((prev) => {
      const exists = prev.productSlugs.includes(slug);
      return {
        ...prev,
        productSlugs: exists
          ? prev.productSlugs.filter((s) => s !== slug)
          : [...prev.productSlugs, slug],
      };
    });
  };

  const activeDrop = drops.find((d) => d.status === "active");

  return (
    <div className="flex flex-col gap-5 font-mono">
      {/* ============================================================== */}
      {/* 1. METRICS & TELEMETRY (Responsive Grid)                        */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111111] border border-[#222222] p-3.5 md:p-4">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6 text-xs">
          <div>
            <span className="text-[#666666] block uppercase tracking-wider text-[9px] md:text-[10px]">
              TOTAL DROPS
            </span>
            <span className="text-[#FAF8F3] font-bold text-base md:text-lg">{drops.length}</span>
          </div>

          <div className="col-span-1 border-l border-[#222222] pl-3 sm:pl-6">
            <span className="text-[#666666] block uppercase tracking-wider text-[9px] md:text-[10px]">
              NAVBAR LATEST DROP
            </span>
            <span className="text-emerald-400 font-bold text-xs md:text-sm tracking-wider flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{activeDrop ? `DROP ${activeDrop.number}: ${activeDrop.title}` : "NONE"}</span>
            </span>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="min-h-[44px] bg-[#FAF8F3] hover:bg-white text-black font-bold uppercase tracking-wider text-xs px-5 py-2.5 transition-none cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>[ + NEW DROP SPEC ]</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1.5 NAVBAR LATEST DROP SELECTOR                                 */}
      {/* ============================================================== */}
      <div className="bg-[#0F1412] border border-emerald-500/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-[#FAF8F3] uppercase tracking-widest">
              NAVBAR &quot;LATEST DROP&quot; SEÇİMİ (/drops/latest)
            </span>
          </div>
          <p className="text-[11px] text-[#888888]">
            Mağaza üst barı, yüzen menü ve çekmecedeki &quot;Son Drop / Latest Drop&quot; bağlantısının yönlendireceği aktif koleksiyonu buradan seçin.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            aria-label="Select Navbar Latest Drop"
            value={activeDrop?.id || ""}
            onChange={(e) => {
              const target = drops.find((d) => d.id === e.target.value);
              if (target && target.id !== activeDrop?.id) {
                handleActivateDrop(target.id, target.title);
              }
            }}
            disabled={activatingId !== null || drops.length === 0}
            className="min-h-[42px] bg-[#0A0A0A] border border-emerald-500/50 text-[#FAF8F3] text-xs font-mono uppercase px-3.5 py-2 cursor-pointer focus:outline-none focus:border-emerald-400"
          >
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                DROP {d.number} — {d.title} {d.status === "active" ? "(AKTİF)" : ""}
              </option>
            ))}
          </select>
          <Link
            href="/drops/latest"
            target="_blank"
            className="min-h-[42px] px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
          >
            <span>ÖNİZLE</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-3 text-xs tracking-wider uppercase font-mono flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-300 px-4 py-3 text-xs tracking-wider uppercase font-mono flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MOBILE COMPACT DROP CARDS (< lg)                             */}
      {/* ============================================================== */}
      <div className="block lg:hidden">
        {loading ? (
          <div className="p-8 text-center text-xs tracking-widest text-[#666666] uppercase animate-pulse border border-[#1A1A1A]">
            READING ATELIER ARCHIVE PROTOCOLS...
          </div>
        ) : drops.length === 0 ? (
          <div className="p-8 text-center text-xs tracking-widest text-[#666666] uppercase border border-[#1A1A1A]">
            NO DROPS FOUND IN VAULT.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {drops.map((drop) => {
              const isActive = drop.status === "active";
              const isUpcoming = drop.status === "upcoming";

              return (
                <div
                  key={drop.id}
                  onClick={() => setSelectedDropForAction(drop)}
                  className={`bg-[#0E0E0E] border p-3.5 flex flex-col gap-2.5 cursor-pointer active:border-white transition-none ${
                    isActive
                      ? "border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                      : "border-[#1E1E1E]"
                  }`}
                >
                  {/* Top Bar with Thumbnail & Status */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 bg-black border border-[#2E2E2E] relative shrink-0 overflow-hidden">
                        {drop.bannerImage ? (
                          <Image src={drop.bannerImage} alt={drop.title} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="text-[9px] text-[#555]">CYRUX</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-[#888888] uppercase tracking-wider">
                          {drop.chapter} • DROP {drop.number}
                        </span>
                        <h4 className="text-sm font-bold text-[#FAF8F3] uppercase truncate tracking-tight">
                          {drop.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActive && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-950/80 border border-emerald-500 text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVE
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-950/40 border border-amber-600/50 text-amber-300">
                          UPCOMING
                        </span>
                      )}
                      {!isActive && !isUpcoming && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-zinc-900 border border-zinc-700 text-zinc-400">
                          ARCHIVED
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDropForAction(drop);
                        }}
                        className="w-8 h-8 flex items-center justify-center border border-[#2A2A2A] bg-[#141414] text-[#888]"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="pt-2 border-t border-[#181818] flex items-center justify-between text-[10px] text-[#888888]">
                    <span>{drop.productSlugs.length} TASARIM MODEL</span>
                    <span>{drop.totalPieces} NUMARALI DÖKÜM</span>
                    <span className="truncate max-w-[100px]">{drop.releaseDate.tr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. DESKTOP DROP CARDS (>= lg)                                   */}
      {/* ============================================================== */}
      <div className="hidden lg:grid grid-cols-1 gap-4">
        {drops.map((drop) => {
          const isActive = drop.status === "active";
          const isUpcoming = drop.status === "upcoming";
          const isArchived = drop.status === "archived";

          return (
            <div
              key={drop.id}
              className={`border bg-[#0E0E0E] transition-none flex items-stretch justify-between ${
                isActive
                  ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
                  : "border-[#1E1E1E] hover:border-[#333333]"
              }`}
            >
              {/* Visual Thumbnail */}
              <div className="w-56 h-36 relative bg-black shrink-0 overflow-hidden border-r border-[#1E1E1E]">
                {drop.bannerImage ? (
                  <Image src={drop.bannerImage} alt={drop.title} fill className="object-cover opacity-80" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#444444] text-[10px] uppercase">
                    NO BANNER
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono border border-white/10 uppercase tracking-widest text-[#FAF8F3]">
                  {drop.number}
                </div>
              </div>

              {/* Drop Details */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#888888] tracking-widest uppercase">
                      {drop.chapter}
                    </span>
                    <span className="text-[#444444]">•</span>
                    <h3 className="text-base font-bold tracking-tight text-[#FAF8F3] uppercase">
                      {drop.title}
                    </h3>
                    <span className="text-[10px] text-[#666666] font-mono tracking-wider">
                      (/drops/{drop.slug})
                    </span>
                  </div>

                  <div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        [ACTIVE LIVE DROP]
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-950/40 border border-amber-600/50 text-amber-300">
                        [UPCOMING]
                      </span>
                    )}
                    {isArchived && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-700 text-zinc-400">
                        [VAULTED / ARCHIVED]
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs text-[#888888] bg-[#080808] p-3 border border-[#161616]">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#555555] block">RELEASE SCHEDULE</span>
                    <span className="text-[#CCCCCC] font-mono text-[11px]">{drop.releaseDate.en}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#555555] block">EDITION LIMIT</span>
                    <span className="text-[#CCCCCC] font-mono text-[11px]">{drop.edition.en}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#555555] block">LINKED PRODUCTS ({drop.productSlugs.length})</span>
                    <span className="text-[#CCCCCC] font-mono text-[11px] truncate block" title={drop.productSlugs.join(", ")}>
                      {drop.productSlugs.length > 0 ? drop.productSlugs.join(", ") : "NO PRODUCTS ASSIGNED"}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#777777] line-clamp-1 italic">
                  &quot;{drop.description.tr || drop.description.en || "No description provided."}&quot;
                </p>
              </div>

              {/* Action Controls */}
              <div className="p-4 bg-[#0A0A0A] border-l border-[#1E1E1E] flex flex-col justify-center items-center gap-2 shrink-0 w-36">
                {!isActive && (
                  <button
                    onClick={() => handleActivateDrop(drop.id, drop.title)}
                    disabled={activatingId === drop.id}
                    className="w-full bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 text-[10px] uppercase font-bold tracking-wider px-3 py-2 cursor-pointer transition-none disabled:opacity-50"
                  >
                    {activatingId === drop.id ? "ACTIVATING..." : "[ACTIVATE]"}
                  </button>
                )}

                <button
                  onClick={() => openEditModal(drop)}
                  className="w-full bg-[#181818] hover:bg-[#252525] text-[#FAF8F3] border border-[#2E2E2E] text-[10px] uppercase font-bold tracking-wider px-3 py-2 cursor-pointer transition-none"
                >
                  [EDIT SPEC]
                </button>

                <Link
                  href={`/drops/${drop.slug}`}
                  target="_blank"
                  className="w-full text-center bg-[#111111] hover:bg-[#1E1E1E] text-[#888888] hover:text-white border border-[#222222] text-[10px] uppercase font-mono tracking-wider px-3 py-2 transition-none"
                >
                  [VIEW ↗]
                </Link>

                {confirmDeleteId === drop.id ? (
                  <div className="flex gap-1 w-full">
                    <button
                      onClick={() => handleDeleteDrop(drop.id, drop.title)}
                      disabled={deletingId === drop.id}
                      className="flex-1 bg-red-900/80 hover:bg-red-800 text-white text-[9px] uppercase font-bold px-2 py-1.5 transition-none"
                    >
                      {deletingId === drop.id ? "..." : "CONFIRM"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="bg-[#222222] text-[#888888] text-[9px] px-2 py-1.5"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(drop.id)}
                    className="w-full text-[#666666] hover:text-red-400 text-[10px] uppercase font-mono tracking-wider px-2 py-1 transition-none"
                  >
                    [DELETE]
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 4. MOBILE DROP ACTION SHEET (Bottom Sheet on Card Tap)          */}
      {/* ============================================================== */}
      {selectedDropForAction && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedDropForAction(null)}
            aria-hidden="true"
          />

          <div className="relative w-full bg-[#0C0C0C] border-t-2 border-white p-5 flex flex-col gap-4 z-10 shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Grab indicator */}
            <div className="w-12 h-1 bg-[#444] rounded-full mx-auto -mt-1 mb-1" />

            {/* Drop Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#222222]">
              <div className="w-14 h-14 bg-black border border-[#2E2E2E] relative shrink-0 overflow-hidden">
                {selectedDropForAction.bannerImage ? (
                  <Image src={selectedDropForAction.bannerImage} alt={selectedDropForAction.title} fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-[10px] text-[#555]">CYRUX</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-[#888888] uppercase block">
                  {selectedDropForAction.chapter} • DROP {selectedDropForAction.number}
                </span>
                <h4 className="font-bold text-sm text-white uppercase truncate">
                  {selectedDropForAction.title}
                </h4>
                <span className="text-[10px] text-[#666]">
                  {selectedDropForAction.productSlugs.length} LINKED PRODUCTS • {selectedDropForAction.totalPieces} LIMIT
                </span>
              </div>
              <button
                onClick={() => setSelectedDropForAction(null)}
                className="w-10 h-10 flex items-center justify-center border border-[#2E2E2E] text-[#888888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action 1: Set Active */}
            {selectedDropForAction.status !== "active" ? (
              <button
                type="button"
                onClick={() => handleActivateDrop(selectedDropForAction.id, selectedDropForAction.title)}
                disabled={activatingId === selectedDropForAction.id}
                className="min-h-[48px] px-4 bg-emerald-950/60 text-emerald-300 border border-emerald-500 font-bold uppercase tracking-wider flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{activatingId === selectedDropForAction.id ? "ACTIVATING..." : "ACTIVATE AS CURRENT DROP"}</span>
                </div>
                <span className="text-[10px]">[SET LIVE]</span>
              </button>
            ) : (
              <div className="min-h-[44px] px-4 bg-emerald-950/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>CURRENTLY LIVE ON STOREFRONT</span>
              </div>
            )}

            {/* Action 2: Edit Drop Specs */}
            <button
              type="button"
              onClick={() => {
                const target = selectedDropForAction;
                setSelectedDropForAction(null);
                openEditModal(target);
              }}
              className="min-h-[48px] px-4 bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2E2E2E] font-bold uppercase tracking-wider flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                <span>EDIT DROP SPECIFICATION</span>
              </div>
              <span className="text-[10px] text-[#888]">[OPEN SHEET]</span>
            </button>

            {/* Action 3: Storefront Preview */}
            <Link
              href={`/drops/${selectedDropForAction.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-4 bg-[#101010] text-[#AAAAAA] hover:text-white border border-[#222222] font-bold uppercase tracking-wider flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <span>VIEW DROP PAGE ON STOREFRONT</span>
              </div>
              <span className="text-[10px]">[↗]</span>
            </Link>

            {/* Action 4: Delete Drop */}
            {confirmDeleteId === selectedDropForAction.id ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteDrop(selectedDropForAction.id, selectedDropForAction.title)}
                  disabled={deletingId === selectedDropForAction.id}
                  className="flex-1 min-h-[48px] bg-red-900 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deletingId === selectedDropForAction.id ? "DELETING..." : "CONFIRM DELETE"}</span>
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
                onClick={() => setConfirmDeleteId(selectedDropForAction.id)}
                className="min-h-[48px] px-4 bg-red-950/20 text-red-400 border border-red-900/40 font-bold uppercase tracking-wider flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>DELETE DROP FROM ARCHIVE</span>
                </div>
                <span className="text-[10px]">[REMOVE]</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedDropForAction(null)}
              className="min-h-[44px] bg-[#141414] text-[#888] hover:text-white uppercase font-bold text-center tracking-wider mt-1 border border-[#222]"
            >
              [ CLOSE SHEET ]
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. CREATE / EDIT DROP BOTTOM SHEET (92vh Scrollable Sheet)     */}
      {/* ============================================================== */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden"
        >
          <div className="bg-[#0E0E0E] border-t-2 md:border border-white md:border-[#2E2E2E] w-full max-w-4xl h-[92vh] md:h-auto md:max-h-[92vh] flex flex-col shadow-2xl text-[#FAF8F3]">
            {/* Mobile Grab Indicator */}
            <div className="md:hidden pt-2.5 pb-1 flex justify-center bg-[#141414] shrink-0">
              <div className="w-12 h-1 bg-[#444444] rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-[#222222] flex items-center justify-between bg-[#121212] shrink-0">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#FAF8F3]">
                  {editingDrop ? `[ EDIT DROP: ${editingDrop.title} ]` : "[ CREATE NEW ATELIER DROP ]"}
                </h3>
                <p className="text-[10px] text-[#777777] uppercase font-mono mt-0.5">
                  METADATA & PRODUCT ALLOCATION MATRIX
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center border border-[#2E2E2E] text-[#888888] hover:text-white font-mono"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDrop} className="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-xs">
              {/* Row 1: Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">CHAPTER *</label>
                  <input
                    type="text"
                    required
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    placeholder="CHAPTER 00"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-3 md:py-2 text-base md:text-xs outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">DROP NUMBER *</label>
                  <input
                    type="text"
                    required
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="01"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-3 md:py-2 text-base md:text-xs outline-none focus:border-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">TITLE (EN/TR) *</label>
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
                    placeholder="FIRST ASCENT"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-3 md:py-2 text-base md:text-xs outline-none focus:border-white font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Status, Slug, Total Pieces */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">STATUS</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "archived" | "upcoming",
                      })
                    }
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-3 md:py-2 text-base md:text-xs outline-none focus:border-white cursor-pointer"
                  >
                    <option value="upcoming">UPCOMING (Hazırlık)</option>
                    <option value="active">ACTIVE (Mevcut Vitrin Drop&apos;ı)</option>
                    <option value="archived">ARCHIVED (Kasaya Kaldırıldı)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">URL SLUG (/drops/[slug])</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="first-ascent"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-3 md:py-2 text-base md:text-xs outline-none focus:border-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">EDITION RUN (TOTAL PIECES)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalPieces}
                    onChange={(e) => setFormData({ ...formData, totalPieces: Number(e.target.value) || 0 })}
                    placeholder="168"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-3 md:py-2 text-base md:text-xs outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Banner Image with Direct Upload & Preview */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-[#888888] uppercase">
                    BANNER IMAGE URL (VAULT / ASSET) *
                  </label>
                  <label className="text-[10px] text-amber-300 hover:text-white uppercase font-bold cursor-pointer flex items-center gap-1">
                    <span>
                      {uploadingBanner ? "[ UPLOADING BANNER ASSET... ]" : "[ UPLOAD NEW BANNER ↑ ]"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBanner}
                      className="hidden"
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
                          const data = await res.json().catch(() => ({}));
                          if (res.ok && data.success && data.url) {
                            setFormData((prev) => ({ ...prev, bannerImage: data.url }));
                            showFeedback("[BANNER UPLOADED] Blob asset attached to drop.");
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
                    className="flex-1 bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-3 md:py-2 text-base md:text-xs outline-none focus:border-white font-mono"
                  />
                  {formData.bannerImage && (
                    <div className="w-12 h-10 bg-black border border-[#333] shrink-0 overflow-hidden relative">
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

              {/* Row 4: Release Dates (TR & EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0A0A0A] p-3 border border-[#1A1A1A]">
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">YAYIN TARİHİ (TR)</label>
                  <input
                    type="text"
                    value={formData.releaseDateTr}
                    onChange={(e) => setFormData({ ...formData, releaseDateTr: e.target.value })}
                    placeholder="KASIM 2026"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-2.5 text-base md:text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">RELEASE DATE (EN)</label>
                  <input
                    type="text"
                    value={formData.releaseDateEn}
                    onChange={(e) => setFormData({ ...formData, releaseDateEn: e.target.value })}
                    placeholder="NOVEMBER 2026"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-2.5 text-base md:text-xs outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Edition Labels (TR & EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0A0A0A] p-3 border border-[#1A1A1A]">
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">EDİSYON ROZETİ (TR)</label>
                  <input
                    type="text"
                    value={formData.editionTr}
                    onChange={(e) => setFormData({ ...formData, editionTr: e.target.value })}
                    placeholder="168 PARÇA • NUMARALI ARŞİV DÖKÜMÜ"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-2.5 text-base md:text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">EDITION BADGE (EN)</label>
                  <input
                    type="text"
                    value={formData.editionEn}
                    onChange={(e) => setFormData({ ...formData, editionEn: e.target.value })}
                    placeholder="168 NUMBERED PIECES • ARCHIVAL RUN"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3.5 py-2.5 text-base md:text-xs outline-none"
                  />
                </div>
              </div>

              {/* Row 6: Descriptions (TR & EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0A0A0A] p-3 border border-[#1A1A1A]">
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">HİKAYE & MANİFESTO (TR)</label>
                  <textarea
                    rows={3}
                    value={formData.descTr}
                    onChange={(e) => setFormData({ ...formData, descTr: e.target.value })}
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white p-3 text-base md:text-xs outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">STORY & ESSENCE (EN)</label>
                  <textarea
                    rows={3}
                    value={formData.descEn}
                    onChange={(e) => setFormData({ ...formData, descEn: e.target.value })}
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white p-3 text-base md:text-xs outline-none resize-none"
                  />
                </div>
              </div>

              {/* Row 7: Attached Products */}
              <div className="bg-[#0A0A0A] border border-[#222222] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      ATTACHED ATELIER PIECES ({formData.productSlugs.length} SELECTED)
                    </h4>
                    <p className="text-[10px] text-[#666666] uppercase">
                      Select which products from catalog belong to this drop
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.productSlugs.length === products.length) {
                        setFormData({ ...formData, productSlugs: [] });
                      } else {
                        setFormData({ ...formData, productSlugs: products.map((p) => p.slug) });
                      }
                    }}
                    className="text-[10px] text-[#888888] hover:text-white uppercase font-mono underline"
                  >
                    {formData.productSlugs.length === products.length ? "[DESELECT ALL]" : "[SELECT ALL]"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {products.map((prod) => {
                    const isSelected = formData.productSlugs.includes(prod.slug);
                    return (
                      <button
                        type="button"
                        key={prod.id}
                        onClick={() => toggleProductInDrop(prod.slug)}
                        className={`min-h-[44px] p-2 border text-left flex items-center gap-2.5 transition-none cursor-pointer ${
                          isSelected
                            ? "bg-[#1E1E1E] border-white text-white"
                            : "bg-[#101010] border-[#222222] text-[#888888] hover:border-[#444444]"
                        }`}
                      >
                        <div className="w-5 h-5 border flex items-center justify-center shrink-0 font-bold text-xs border-white/40">
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        </div>
                        <div className="overflow-hidden leading-tight">
                          <span className="block text-[11px] font-bold truncate text-[#FAF8F3]">
                            {prod.name}
                          </span>
                          <span className="text-[9px] font-mono text-[#666666]">
                            ${prod.price} • {prod.slug}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Action Buttons (Sticky Bottom on Mobile) */}
              <div className="pt-4 border-t border-[#222222] flex items-center justify-end gap-3 sticky bottom-0 bg-[#0E0E0E] py-3 -mx-4 md:-mx-6 px-4 md:px-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-4 text-xs font-mono uppercase tracking-wider text-[#888888] hover:text-white border border-[#2E2E2E]"
                >
                  [CANCEL]
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] flex-1 md:flex-none px-6 bg-[#FAF8F3] hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? "[PERSISTING DROP...]" : editingDrop ? "[UPDATE DROP]" : "[COMMIT NEW DROP]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
