"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BlobUploader } from "./blob-uploader";
import { AdminBottomSheet } from "./admin-bottom-sheet";
import {
  Check,
  Copy,
  ExternalLink,
  Trash2,
  AlertCircle,
  Search,
  X,
} from "lucide-react";

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
      setError(null);
      const res = await fetch("/api/admin/blob");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        blobs?: BlobAssetItem[];
        error?: string;
      };
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
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Failed to delete media asset");
      }
    } catch {
      setError("Network error deleting media asset");
    } finally {
      setDeletingUrl(null);
      setConfirmDeleteUrl(null);
    }
  };

  const isVideoAsset = (item: BlobAssetItem) =>
    item.pathname.endsWith(".mp4") ||
    item.pathname.endsWith(".mov") ||
    Boolean(item.contentType?.startsWith("video/"));

  const filtered = blobs.filter((b) => {
    const isVideo = isVideoAsset(b);
    if (filterType === "images" && isVideo) return false;
    if (filterType === "videos" && !isVideo) return false;
    if (search.trim()) {
      return (
        b.pathname.toLowerCase().includes(search.toLowerCase()) ||
        b.url.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5 bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Storage Summary */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wider text-[#0A0A0A]">
          Media Library ({blobs.length} assets)
        </span>
        <span className="text-[#525252]">
          Images up to 15MB • Videos up to 50MB
        </span>
      </div>

      {/* Uploader Card */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-3">
        <h3 className="text-xs uppercase font-semibold tracking-wider text-[#0A0A0A]">
          Upload New Media
        </h3>
        <BlobUploader onUploadSuccess={() => fetchBlobs()} />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "all", label: `All (${blobs.length})` },
              { id: "images", label: "Images" },
              { id: "videos", label: "Videos" },
            ] as const
          ).map((tab) => {
            const active = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`min-h-[44px] px-4 py-2 text-xs font-medium uppercase tracking-wider border whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  active
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A] hover:border-[#0A0A0A]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename..."
            aria-label="Search media filename"
            className="w-full min-h-[44px] bg-[#FAF8F3] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs pl-9 pr-9 py-2.5 rounded-none placeholder:text-[#737373]"
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

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          <span>{error}</span>
        </div>
      )}

      {/* Media Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs uppercase tracking-wider text-[#525252] bg-[#FFFFFF] border border-[#E8E4DC]">
          Loading media assets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs uppercase tracking-wider text-[#525252] bg-[#FFFFFF] border border-[#E8E4DC]">
          No media assets match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((item, idx) => {
            const isVideo = isVideoAsset(item);
            const sizeFormatted = formatSize(item.size);
            const displayName = item.pathname.replace(/^uploads\/\d+-/, "");

            return (
              <div
                key={item.url || idx}
                className="bg-[#FFFFFF] border border-[#E8E4DC] p-2.5 sm:p-3 flex flex-col justify-between gap-2.5 min-w-0"
              >
                {/* Visual */}
                <div className="w-full h-32 sm:h-44 bg-[#FAF8F3] border border-[#E8E4DC] overflow-hidden flex items-center justify-center relative">
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
                      alt={displayName}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-[#FFFFFF]/90 border border-[#E8E4DC] text-[10px] font-mono font-medium px-1.5 py-0.5 text-[#0A0A0A] uppercase">
                    {isVideo ? "MP4" : "IMG"}
                  </span>
                  <span className="absolute top-1.5 right-1.5 bg-[#FFFFFF]/90 border border-[#E8E4DC] text-[10px] font-mono px-1.5 py-0.5 text-[#525252]">
                    {sizeFormatted}
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div
                    title={item.pathname}
                    className="text-xs text-[#0A0A0A] font-medium truncate"
                  >
                    {displayName}
                  </div>
                  <div className="hidden sm:block text-[10px] text-[#737373] truncate font-mono">
                    {item.url}
                  </div>
                </div>

                {/* Mobile Detail Trigger */}
                <button
                  type="button"
                  onClick={() => setSelectedAsset(item)}
                  className="md:hidden min-h-[44px] w-full border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <span>Details & Actions</span>
                </button>

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex pt-2 border-t border-[#E8E4DC] items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.url)}
                    className="min-h-[44px] px-2.5 border border-[#E8E4DC] bg-[#FAF8F3] hover:border-[#0A0A0A] text-[11px] font-medium text-[#0A0A0A] uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    {copiedUrl === item.url ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  {confirmDeleteUrl === item.url ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.url)}
                        disabled={deletingUrl === item.url}
                        className="min-h-[44px] px-2.5 bg-red-700 hover:bg-red-800 text-[#FFFFFF] text-[11px] font-medium uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                      >
                        {deletingUrl === item.url ? "..." : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteUrl(null)}
                        aria-label="Cancel delete"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] text-[#525252] hover:text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteUrl(item.url)}
                      aria-label={`Delete ${displayName}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E8E4DC] text-red-700 hover:bg-red-50 hover:border-red-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Asset Action Bottom Sheet */}
      <AdminBottomSheet
        isOpen={Boolean(selectedAsset)}
        onClose={() => {
          setSelectedAsset(null);
          setConfirmDeleteUrl(null);
        }}
        title={
          selectedAsset
            ? selectedAsset.pathname.replace(/^uploads\/\d+-/, "")
            : "Media Details"
        }
        subtitle={
          selectedAsset
            ? `${formatSize(selectedAsset.size)} • ${selectedAsset.contentType || "Asset"}`
            : undefined
        }
      >
        {selectedAsset && (
          <div className="flex flex-col gap-4">
            <div className="w-full max-h-56 bg-[#FAF8F3] border border-[#E8E4DC] flex items-center justify-center overflow-hidden">
              {isVideoAsset(selectedAsset) ? (
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

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => copyToClipboard(selectedAsset.url)}
                className="min-h-[44px] w-full bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] text-xs uppercase font-medium tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                {copiedUrl === selectedAsset.url ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>URL Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Asset URL</span>
                  </>
                )}
              </button>

              <a
                href={selectedAsset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] w-full bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs uppercase font-medium tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Original</span>
              </a>

              {confirmDeleteUrl === selectedAsset.url ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDelete(selectedAsset.url);
                      setSelectedAsset(null);
                    }}
                    disabled={deletingUrl === selectedAsset.url}
                    className="min-h-[44px] flex-1 bg-red-700 hover:bg-red-800 text-[#FFFFFF] text-xs uppercase font-medium tracking-wider flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    {deletingUrl === selectedAsset.url ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteUrl(null)}
                    className="min-h-[44px] px-4 bg-[#FAF8F3] text-[#0A0A0A] border border-[#E8E4DC] text-xs uppercase font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteUrl(selectedAsset.url)}
                  className="min-h-[44px] w-full bg-red-50 text-red-800 border border-red-300 hover:bg-red-100 text-xs uppercase font-medium tracking-wider flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Permanently</span>
                </button>
              )}
            </div>
          </div>
        )}
      </AdminBottomSheet>
    </div>
  );
}
