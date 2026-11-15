"use client";

import React, { useState, useRef } from "react";

export interface BlobUploaderProps {
  onUploadSuccess?: (result: {
    url: string;
    pathname: string;
    contentType: string;
    size: number;
  }) => void;
  compact?: boolean;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/quicktime",
];

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export function BlobUploader({ onUploadSuccess, compact = false }: BlobUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);
    setSuccessMsg(null);

    // Validate MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Unsupported media type: ${file.type || "unknown"}. Allowed: WebP, PNG, JPEG, AVIF, MP4, MOV.`);
      return;
    }

    // Validate Size
    const isVideo = file.type.startsWith("video/");
    const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > limit) {
      const limitMb = isVideo ? 50 : 15;
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${limitMb}MB.`);
      return;
    }

    setUploading(true);
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(60);
      const res = await fetch("/api/admin/blob/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      setProgress(100);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccessMsg(`[SUCCESS] UPLOADED: ${file.name}`);
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setError(msg);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(null), 1000);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 font-mono">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed transition-none cursor-pointer flex flex-col items-center justify-center text-center ${
          compact ? "p-4" : "p-8"
        } ${
          dragActive
            ? "border-[#FAF8F3] bg-[#1E1E1E]"
            : "border-[#333333] hover:border-[#888888] bg-[#0E0E0E]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="text-xs uppercase font-bold tracking-widest text-[#FAF8F3]">
          {uploading ? "[ UPLOADING FILE TO VERCEL BLOB... ]" : "[ SELECT OR DROP ASSET HERE ]"}
        </div>
        <p className="mt-1 text-[11px] text-[#666666] tracking-wider uppercase">
          IMAGES &le; 15MB (WEBP, PNG, JPEG, AVIF) • VIDEOS &le; 50MB (MP4, MOV)
        </p>

        {progress !== null && (
          <div className="mt-4 w-full max-w-xs bg-[#222222] h-1.5 overflow-hidden">
            <div
              className="bg-[#FAF8F3] h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider">
          [!] {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/80 text-emerald-300 text-xs p-3 uppercase tracking-wider">
          {successMsg}
        </div>
      )}
    </div>
  );
}
