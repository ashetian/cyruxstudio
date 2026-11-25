"use client";

import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

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

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
// Vercel Serverless Function request body limit is 4.5MB; compress images above 2MB automatically to high-quality WebP
const VERCEL_SAFE_IMAGE_BYTES = 2 * 1024 * 1024;

async function optimizeImageForUpload(file: File): Promise<File> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.size <= VERCEL_SAFE_IMAGE_BYTES
  ) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new window.Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const maxDim = 2560;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const optimized = new File([blob], `${baseName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });
          resolve(optimized);
        },
        "image/webp",
        0.88
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      resolve(file);
    };
    img.src = objUrl;
  });
}

export function BlobUploader({ onUploadSuccess, compact = false }: BlobUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    let successCount = 0;
    try {
      for (let i = 0; i < fileList.length; i++) {
        const rawFile = fileList[i];
        if (!ALLOWED_TYPES.includes(rawFile.type)) {
          throw new Error(
            `Unsupported media type: ${rawFile.type || "unknown"}. Allowed: WebP, PNG, JPEG, AVIF, MP4, MOV.`
          );
        }

        const isVideo = rawFile.type.startsWith("video/");
        const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (rawFile.size > limit) {
          const limitMb = isVideo ? 50 : 15;
          throw new Error(
            `File ${rawFile.name} (${(rawFile.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${limitMb}MB.`
          );
        }

        setProgress(Math.round(((i + 0.2) / fileList.length) * 100));
        const file = isVideo ? rawFile : await optimizeImageForUpload(rawFile);

        setProgress(Math.round(((i + 0.4) / fileList.length) * 100));
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/blob/upload", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          url?: string;
          pathname?: string;
          contentType?: string;
          size?: number;
        };

        if (!res.ok || !data.success || !data.url) {
          throw new Error(
            data.error ||
              (res.status === 413
                ? `File ${rawFile.name} is too large for serverless upload.`
                : `Upload failed for ${rawFile.name} (HTTP ${res.status})`)
          );
        }

        successCount++;
        setProgress(Math.round(((i + 1) / fileList.length) * 100));
        if (onUploadSuccess) {
          onUploadSuccess({
            url: data.url,
            pathname: data.pathname || file.name,
            contentType: data.contentType || file.type,
            size: data.size ?? file.size,
          });
        }
      }

      setSuccessMsg(
        `Uploaded ${successCount} asset${successCount > 1 ? "s" : ""} to media library.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setError(msg);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(null), 1200);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Select or drop media asset files"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={`min-h-[44px] border border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
          compact ? "p-4" : "p-7"
        } ${
          dragActive
            ? "border-[#0A0A0A] bg-[#F4F1EA]"
            : "border-[#D4CFC4] hover:border-[#0A0A0A] bg-[#FAF8F3]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload className="w-4 h-4 text-[#0A0A0A] mb-1.5" />
        <div className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
          {uploading ? "Uploading asset..." : "Select or drop asset"}
        </div>
        <p className="mt-1 text-[11px] text-[#525252]">
          Images up to 15MB (WebP, PNG, JPEG, AVIF) • Videos up to 50MB (MP4, MOV)
        </p>

        {progress !== null && (
          <div className="mt-3 w-full max-w-xs bg-[#E8E4DC] h-1.5 overflow-hidden">
            <div
              className="bg-[#0A0A0A] h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 text-xs p-3 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
