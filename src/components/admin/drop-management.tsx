"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DropData } from "@/lib/drops";

interface ProductMinimal {
  id: string;
  name: string;
  slug: string;
  price: number;
  mediaUrls: string[];
}

export function DropManagement() {
  const [drops, setDrops] = useState<DropData[]>([]);
  const [products, setProducts] = useState<ProductMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<DropData | null>(null);
  const [saving, setSaving] = useState(false);
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
      editionTr: "150 PARÇA • NUMARALI ARŞİV DROPU",
      editionEn: "150 NUMBERED PIECES • ARCHIVAL RUN",
      descTr: "Kıbrıs atölyemizde limitli üretilmiş avangart sokak giyimi serisi.",
      descEn: "Limited avant-garde streetwear run crafted at our Cyprus atelier.",
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
        showFeedback(`DROP [${title}] IS NOW CURRENT ACTIVE DROP`);
        fetchDrops();
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
        fetchDrops();
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
    <div className="flex flex-col gap-6">
      {/* Telemetry & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111111] border border-[#222222] p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-[#666666] block uppercase tracking-wider text-[10px]">TOTAL DROPS</span>
            <span className="text-[#FAF8F3] font-bold text-base">{drops.length}</span>
          </div>
          <div className="w-[1px] h-8 bg-[#222222]" />
          <div>
            <span className="text-[#666666] block uppercase tracking-wider text-[10px]">CURRENT ACTIVE DROP</span>
            <span className="text-emerald-400 font-bold text-sm tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {activeDrop ? `[DROP ${activeDrop.number}: ${activeDrop.title}]` : "NONE"}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-[#222222]" />
          <div>
            <span className="text-[#666666] block uppercase tracking-wider text-[10px]">PERSISTENCE STATUS</span>
            <span className="text-white/80 font-mono text-xs">DYNAMIC FILE STORE (data/drops.json)</span>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-[#FAF8F3] hover:bg-white text-black font-bold uppercase tracking-wider text-xs px-4 py-2.5 transition-none cursor-pointer flex items-center gap-2"
        >
          <span>[+ NEW DROP SPECIFICATION]</span>
        </button>
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

      {/* Drops Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs tracking-widest text-[#666666] uppercase animate-pulse border border-[#1A1A1A]">
          READING ATELIER ARCHIVE PROTOCOLS...
        </div>
      ) : drops.length === 0 ? (
        <div className="p-12 text-center text-xs tracking-widest text-[#666666] uppercase border border-[#1A1A1A]">
          NO DROPS FOUND IN VAULT. INITIALIZE YOUR FIRST DROP ABOVE.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {drops.map((drop) => {
            const isActive = drop.status === "active";
            const isUpcoming = drop.status === "upcoming";
            const isArchived = drop.status === "archived";

            return (
              <div
                key={drop.id}
                className={`border bg-[#0E0E0E] transition-none flex flex-col lg:flex-row items-stretch justify-between ${
                  isActive
                    ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
                    : "border-[#1E1E1E] hover:border-[#333333]"
                }`}
              >
                {/* Visual Thumbnail */}
                <div className="w-full lg:w-56 h-36 relative bg-black shrink-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1E1E1E]">
                  {drop.bannerImage ? (
                    <Image
                      src={drop.bannerImage}
                      alt={drop.title}
                      fill
                      className="object-cover opacity-80"
                      unoptimized
                    />
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
                <div className="p-4 md:p-5 flex-1 flex flex-col justify-between gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
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

                    {/* Status Badge */}
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

                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#888888] bg-[#080808] p-3 border border-[#161616]">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#555555] block">RELEASE SCHEDULE</span>
                      <span className="text-[#CCCCCC] font-mono text-[11px]">{drop.releaseDate.en} ({drop.releaseDate.tr})</span>
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

                  {/* Description preview */}
                  <p className="text-[11px] text-[#777777] line-clamp-1 italic">
                    &quot;{drop.description.tr || drop.description.en || "No description provided."}&quot;
                  </p>
                </div>

                {/* Action Controls */}
                <div className="p-4 bg-[#0A0A0A] border-t lg:border-t-0 lg:border-l border-[#1E1E1E] flex lg:flex-col justify-end lg:justify-center items-center gap-2 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => handleActivateDrop(drop.id, drop.title)}
                      disabled={activatingId === drop.id}
                      className="w-full bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 text-[10px] uppercase font-bold tracking-wider px-3 py-2 cursor-pointer transition-none disabled:opacity-50"
                      title="Set as current active drop on storefront"
                    >
                      {activatingId === drop.id ? "[ACTIVATING...]" : "[ACTIVATE DROP]"}
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
      )}

      {/* CREATE / EDIT DROP MODAL */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="bg-[#0E0E0E] border border-[#2E2E2E] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-[#FAF8F3]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#222222] flex items-center justify-between bg-[#141414]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#FAF8F3]">
                  {editingDrop ? `[ EDIT DROP: ${editingDrop.title} ]` : "[ CREATE NEW ATELIER DROP ]"}
                </h3>
                <p className="text-[11px] text-[#777777] uppercase font-mono mt-0.5">
                  PERSISTENT METADATA & LINKED PIECE ALLOCATION
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#888888] hover:text-white font-mono text-sm px-2 py-1"
              >
                [✕ CLOSE]
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDrop} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-xs">
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
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
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
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">TITLE (ENGLISH / TURKISH) *</label>
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
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white font-bold"
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
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white cursor-pointer"
                  >
                    <option value="upcoming">UPCOMING (Geçici Hazırlık)</option>
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
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#888888] uppercase mb-1">TOTAL PIECES (LIMIT)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalPieces}
                    onChange={(e) => setFormData({ ...formData, totalPieces: Number(e.target.value) || 0 })}
                    placeholder="168"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Banner Image */}
              <div>
                <label className="block text-[10px] text-[#888888] uppercase mb-1">
                  BANNER IMAGE URL (VAULT OR STATIC PATH)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.bannerImage}
                    onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                    placeholder="/assets/editorial/hero-desktop.jpg"
                    className="flex-1 bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-[#666666]">
                  <span>PRESETS:</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, bannerImage: "/assets/editorial/hero-desktop.jpg" })}
                    className="hover:text-white underline"
                  >
                    Editorial Hero
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, bannerImage: "/assets/brand/hero-cyber-portrait.webp" })}
                    className="hover:text-white underline"
                  >
                    Cyber Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, bannerImage: "/assets/campaign/campaign-card-puffer.webp" })}
                    className="hover:text-white underline"
                  >
                    Campaign Puffer
                  </button>
                </div>
              </div>

              {/* Row 4: Release Dates (TR & EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#080808] p-3 border border-[#1A1A1A]">
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">YAYIN TARİHİ (TR)</label>
                  <input
                    type="text"
                    value={formData.releaseDateTr}
                    onChange={(e) => setFormData({ ...formData, releaseDateTr: e.target.value })}
                    placeholder="KASIM 2026"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">RELEASE DATE (EN)</label>
                  <input
                    type="text"
                    value={formData.releaseDateEn}
                    onChange={(e) => setFormData({ ...formData, releaseDateEn: e.target.value })}
                    placeholder="NOVEMBER 2026"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Row 5: Edition Labels (TR & EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#080808] p-3 border border-[#1A1A1A]">
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">EDİSYON ETİKETİ (TR)</label>
                  <input
                    type="text"
                    value={formData.editionTr}
                    onChange={(e) => setFormData({ ...formData, editionTr: e.target.value })}
                    placeholder="168 PARÇA • NUMARALI ARŞİV DROPU"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">EDITION BADGE (EN)</label>
                  <input
                    type="text"
                    value={formData.editionEn}
                    onChange={(e) => setFormData({ ...formData, editionEn: e.target.value })}
                    placeholder="168 NUMBERED PIECES • ARCHIVAL RUN"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Row 6: Descriptions (TR & EN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#080808] p-3 border border-[#1A1A1A]">
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">HİKAYE & AÇIKLAMA (TR)</label>
                  <textarea
                    rows={3}
                    value={formData.descTr}
                    onChange={(e) => setFormData({ ...formData, descTr: e.target.value })}
                    placeholder="Chapter 00 İlk Drop; hazır modanın tekdüze kalıplarını reddeden 5 giyilebilir sanat parçasından oluşur..."
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white leading-relaxed resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-amber-400/80 uppercase mb-1">STORY & ESSENCE (EN)</label>
                  <textarea
                    rows={3}
                    value={formData.descEn}
                    onChange={(e) => setFormData({ ...formData, descEn: e.target.value })}
                    placeholder="Chapter 00 First Ascent consists of 5 wearable art sculptures rejecting fast fashion templates..."
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 text-xs focus:outline-none focus:border-white leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Row 7: Product Allocations */}
              <div className="bg-[#0A0A0A] border border-[#222222] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      ATTACHED ATELIER PIECES ({formData.productSlugs.length} SELECTED)
                    </h4>
                    <p className="text-[10px] text-[#666666] uppercase">
                      Check which products from your inventory catalog belong to this drop
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
                        className={`p-2 border text-left flex items-center gap-2.5 transition-none cursor-pointer ${
                          isSelected
                            ? "bg-[#1E1E1E] border-white text-white"
                            : "bg-[#101010] border-[#222222] text-[#888888] hover:border-[#444444]"
                        }`}
                      >
                        <div className="w-4 h-4 border flex items-center justify-center shrink-0 font-bold text-[10px] border-white/40">
                          {isSelected ? "✓" : ""}
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

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-[#222222] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#888888] hover:text-white border border-transparent hover:border-[#333333]"
                >
                  [CANCEL]
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#FAF8F3] hover:bg-white text-black font-bold uppercase tracking-wider text-xs px-6 py-2.5 transition-none cursor-pointer disabled:opacity-50"
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
