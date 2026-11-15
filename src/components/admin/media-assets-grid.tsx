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
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [confirmDeleteUrl, setConfirmDeleteUrl] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121212] border border-[#222222] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none border ${
              filterType === "all"
                ? "bg-[#FAF8F3] text-[#0A0A0A] border-[#FAF8F3]"
                : "bg-transparent text-[#777777] border-[#333333] hover:text-[#FAF8F3]"
            }`}
          >
            [ ALL ({blobs.length}) ]
          </button>
          <button
            onClick={() => setFilterType("images")}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none border ${
              filterType === "images"
                ? "bg-[#FAF8F3] text-[#0A0A0A] border-[#FAF8F3]"
                : "bg-transparent text-[#777777] border-[#333333] hover:text-[#FAF8F3]"
            }`}
          >
            [ IMAGES ]
          </button>
          <button
            onClick={() => setFilterType("videos")}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none border ${
              filterType === "videos"
                ? "bg-[#FAF8F3] text-[#0A0A0A] border-[#FAF8F3]"
                : "bg-transparent text-[#777777] border-[#333333] hover:text-[#FAF8F3]"
            }`}
          >
            [ VIDEOS ]
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH ASSET FILENAME..."
          className="bg-[#0A0A0A] border border-[#333333] focus:border-[#FAF8F3] text-[#FAF8F3] text-xs px-3.5 py-2 rounded-none outline-none uppercase min-w-[200px]"
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
          [ NO ASSETS STORED IN THIS VIEW ]
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item, idx) => {
            const isVideo =
              item.pathname.endsWith(".mp4") ||
              item.pathname.endsWith(".mov") ||
              item.contentType?.startsWith("video/");
            const sizeFormatted =
              item.size > 1024 * 1024
                ? `${(item.size / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(item.size / 1024)} KB`;

            return (
              <div
                key={item.url || idx}
                className="bg-[#121212] border border-[#222222] p-3 flex flex-col justify-between hover:border-[#444444] transition-none"
              >
                {/* Visual */}
                <div className="w-full h-44 bg-[#0A0A0A] border border-[#1E1E1E] overflow-hidden flex items-center justify-center relative">
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
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-2 left-2 bg-black/80 text-[9px] px-1.5 py-0.5 text-[#CCCCCC] uppercase tracking-wider">
                    {isVideo ? "VIDEO/MP4" : "IMAGE/WEBP"}
                  </span>
                  <span className="absolute top-2 right-2 bg-black/80 text-[9px] px-1.5 py-0.5 text-[#888888]">
                    {sizeFormatted}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 flex flex-col gap-1">
                  <div
                    title={item.pathname}
                    className="text-xs text-[#FAF8F3] font-bold truncate uppercase"
                  >
                    {item.pathname.replace(/^uploads\/\d+-/, "")}
                  </div>
                  <div className="text-[10px] text-[#666666] truncate font-mono">
                    {item.url}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[#1E1E1E] flex items-center justify-between gap-2">
                  <button
                    onClick={() => copyToClipboard(item.url)}
                    className="text-[11px] text-[#FAF8F3] hover:underline uppercase tracking-wider"
                  >
                    {copiedUrl === item.url ? "[ COPIED! ✓ ]" : "[ COPY URL ]"}
                  </button>

                  {confirmDeleteUrl === item.url ? (
                    <div className="flex items-center gap-1.5">
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
                      onClick={() => setConfirmDeleteUrl(item.url)}
                      className="text-red-400 hover:text-red-300 text-[11px] uppercase tracking-wider"
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
    </div>
  );
}
