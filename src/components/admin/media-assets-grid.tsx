"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BlobUploader } from "./blob-uploader";

export interface BlobAssetItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  contentType?: string;
}

export function MediaAssetsGrid() {
  const [blobs, setBlobs] = useState<BlobAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "images" | "videos">("all");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<BlobAssetItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [confirmDeleteUrl, setConfirmDeleteUrl] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const fetchBlobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/blob");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setBlobs(data.blobs || []);
      } else {
        setError(data.error || "Failed to fetch media assets");
      }
    } catch {
      setError("Network error fetching media assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlobs();
  }, [fetchBlobs]);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDelete = async (url: string) => {
    setDeletingUrl(url);
    try {
      const res = await fetch("/api/admin/blob/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        setBlobs((prev) => prev.filter((b) => b.url !== url));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete blob");
      }
    } catch {
      setError("Network error deleting blob");
    } finally {
      setDeletingUrl(null);
      setConfirmDeleteUrl(null);
    }
  };

  const filtered = blobs.filter((b) => {
    const isVideo = b.pathname.endsWith(".mp4") || b.pathname.endsWith(".mov") || b.contentType?.startsWith("video/");
    if (filterType === "images" && isVideo) return false;
    if (filterType === "videos" && !isVideo) return false;
    if (search.trim()) {
      return b.pathname.toLowerCase().includes(search.toLowerCase()) || b.url.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Storage Status Ribbon */}
      <div className="bg-[#121212] border border-[#222222] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[#FAF8F3] font-bold uppercase tracking-wider">
            STORAGE GATEWAY: VERCEL BLOB RESILIENT VAULT
          </span>
        </div>
        <div className="text-[11px] text-[#777777] uppercase tracking-wider">
          LIMITS: &le;15MB IMAGES • &le;50MB VIDEOS • PUBLIC CDN ACCESS
        </div>
      </div>

      {/* Uploader Card */}
      <div className="bg-[#121212] border border-[#222222] p-6 flex flex-col gap-3">
        <div className="text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
          [ DIRECT ASSET INGESTION ]
        </div>
        <BlobUploader onUploadSuccess={() => fetchBlobs()} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121212] border border-[#222222] p-3.5 sm:p-4">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType("all")}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-none border whitespace-nowrap cursor-pointer ${
              filterType === "all"
                ? "bg-[#FAF8F3] text-[#0A0A0A] border-[#FAF8F3]"
                : "bg-transparent text-[#777777] border-[#333333] hover:text-[#FAF8F3] active:bg-[#1A1A1A]"
            }`}
          >
            [ HEPSİ ({blobs.length}) ]
          </button>
          <button
            onClick={() => setFilterType("images")}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-none border whitespace-nowrap cursor-pointer ${
              filterType === "images"
                ? "bg-[#FAF8F3] text-[#0A0A0A] border-[#FAF8F3]"
                : "bg-transparent text-[#777777] border-[#333333] hover:text-[#FAF8F3] active:bg-[#1A1A1A]"
            }`}
          >
            [ FOTOĞRAF ]
          </button>
          <button
            onClick={() => setFilterType("videos")}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-none border whitespace-nowrap cursor-pointer ${
              filterType === "videos"
                ? "bg-[#FAF8F3] text-[#0A0A0A] border-[#FAF8F3]"
                : "bg-transparent text-[#777777] border-[#333333] hover:text-[#FAF8F3] active:bg-[#1A1A1A]"
            }`}
          >
            [ VİDEO ]
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="DOSYA ADI ARA..."
          className="bg-[#0A0A0A] border border-[#333333] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3.5 py-2.5 rounded-none outline-none uppercase min-w-[200px] min-h-[44px] md:min-h-0"
        />
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider">
          [!] {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-[#666666] tracking-widest uppercase text-xs">
          [ SCANNING VERCEL BLOB ASSET REGISTRY... ]
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[#666666] tracking-widest uppercase text-xs border border-[#222222] bg-[#0E0E0E]">
          [ BU GÖRÜNÜMDE ASSET BULUNAMADI ]
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {filtered.map((item, idx) => {
            const isVideo =
              item.pathname.endsWith(".mp4") ||
              item.pathname.endsWith(".mov") ||
              item.contentType?.startsWith("video/");
            const sizeFormatted = formatSize(item.size);

            return (
              <div
                key={item.url || idx}
                onClick={() => {
                  // On mobile screens, tapping opens the action sheet
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setSelectedAsset(item);
                  }
                }}
                className="bg-[#121212] border border-[#222222] p-2.5 sm:p-3 flex flex-col justify-between hover:border-[#444444] active:scale-[0.99] transition-transform cursor-pointer md:cursor-default"
              >
                {/* Visual */}
                <div className="w-full h-32 sm:h-44 bg-[#0A0A0A] border border-[#1E1E1E] overflow-hidden flex items-center justify-center relative">
                  {isVideo ? (
                    <video
                      src={item.url}
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.url}
                      alt={item.pathname}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-black/85 text-[8px] sm:text-[9px] px-1.5 py-0.5 text-[#CCCCCC] uppercase tracking-wider">
                    {isVideo ? "MP4" : "IMG"}
                  </span>
                  <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-black/85 text-[8px] sm:text-[9px] px-1.5 py-0.5 text-[#888888]">
                    {sizeFormatted}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-2.5 flex flex-col gap-0.5">
                  <div
                    title={item.pathname}
                    className="text-[11px] sm:text-xs text-[#FAF8F3] font-bold truncate uppercase"
                  >
                    {item.pathname.replace(/^uploads\/\d+-/, "")}
                  </div>
                  <div className="hidden sm:block text-[10px] text-[#666666] truncate font-mono">
                    {item.url}
                  </div>
                </div>

                {/* Mobile tap indicator */}
                <div className="md:hidden mt-2 pt-2 border-t border-[#1E1E1E] flex items-center justify-between text-[9px] text-[#777777] uppercase font-bold tracking-wider">
                  <span>İŞLEMLER</span>
                  <span className="text-[#FAF8F3]">[DOKUN ↗]</span>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex mt-4 pt-3 border-t border-[#1E1E1E] items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(item.url);
                    }}
                    className="text-[11px] text-[#FAF8F3] hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    {copiedUrl === item.url ? "[ COPIED! ✓ ]" : "[ COPY URL ]"}
                  </button>

                  {confirmDeleteUrl === item.url ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(item.url)}
                        disabled={deletingUrl === item.url}
                        className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-1.5 py-0.5 uppercase"
                      >
                        {deletingUrl === item.url ? "..." : "CONFIRM?"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteUrl(null)}
                        className="text-[10px] text-[#777777]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteUrl(item.url);
                      }}
                      className="text-red-400 hover:text-red-300 text-[11px] uppercase tracking-wider cursor-pointer"
                    >
                      [DELETE ✕]
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Asset Action Bottom Sheet */}
      {selectedAsset && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => {
              setSelectedAsset(null);
              setConfirmDeleteUrl(null);
            }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Action Sheet Panel */}
          <div className="relative bg-[#121212] border-t-2 border-[#FAF8F3] p-5 pb-8 flex flex-col gap-4 max-h-[85vh] overflow-y-auto z-10">
            {/* Grab Bar */}
            <div className="w-10 h-1 bg-[#444444] rounded-full mx-auto" />

            {/* Header */}
            <div className="flex items-start justify-between pb-2 border-b border-[#222222]">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="text-[10px] text-[#777777] uppercase tracking-widest font-mono">
                  [ MEDYA DETAYI ]
                </span>
                <span className="text-xs font-bold text-[#FAF8F3] truncate uppercase font-mono">
                  {selectedAsset.pathname.replace(/^uploads\/\d+-/, "")}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedAsset(null);
                  setConfirmDeleteUrl(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-[#777777] hover:text-[#FAF8F3] border border-[#2E2E2E] text-xs font-mono"
              >
                ✕
              </button>
            </div>

            {/* Large Visual Preview */}
            <div className="w-full max-h-56 bg-[#0A0A0A] border border-[#222222] flex items-center justify-center overflow-hidden">
              {selectedAsset.pathname.endsWith(".mp4") ||
              selectedAsset.pathname.endsWith(".mov") ||
              selectedAsset.contentType?.startsWith("video/") ? (
                <video
                  src={selectedAsset.url}
                  controls
                  playsInline
                  className="w-full max-h-56 object-contain"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.pathname}
                  className="w-full max-h-56 object-contain"
                />
              )}
            </div>

            {/* Metadata specs */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#888888] bg-[#0A0A0A] p-2.5 border border-[#1E1E1E]">
              <div>BOYUT: {formatSize(selectedAsset.size)}</div>
              <div className="truncate">TİP: {selectedAsset.contentType || "N/A"}</div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={() => copyToClipboard(selectedAsset.url)}
                className="min-h-[44px] w-full bg-[#1F1F1F] active:bg-[#2A2A2A] text-[#FAF8F3] border border-[#333333] text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"
              >
                {copiedUrl === selectedAsset.url ? "✓ URL PANOLANDI" : "[ GÖRSEL URL'SİNİ KOPYALA ]"}
              </button>

              <a
                href={selectedAsset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] w-full bg-transparent active:bg-[#1A1A1A] text-[#FAF8F3] border border-[#2E2E2E] text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"
              >
                [ YENİ SEKMEDE ORİJİNALİ AÇ ↗ ]
              </a>

              {confirmDeleteUrl === selectedAsset.url ? (
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await handleDelete(selectedAsset.url);
                      setSelectedAsset(null);
                    }}
                    disabled={deletingUrl === selectedAsset.url}
                    className="min-h-[44px] flex-1 bg-red-600 hover:bg-red-500 text-white text-xs uppercase font-bold tracking-wider flex items-center justify-center"
                  >
                    {deletingUrl === selectedAsset.url ? "SİLİNİYOR..." : "[ EVET, KALICI OLARAK SİL ]"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteUrl(null)}
                    className="min-h-[44px] px-4 bg-[#1E1E1E] text-[#AAAAAA] hover:text-[#FAF8F3] border border-[#333333] text-xs uppercase"
                  >
                    İPTAL
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteUrl(selectedAsset.url)}
                  className="min-h-[44px] w-full bg-red-950/30 active:bg-red-950/60 text-red-400 border border-red-900/50 text-xs uppercase font-bold tracking-wider flex items-center justify-center"
                >
                  [ GÖRSELİ KALICI SİL ✕ ]
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
