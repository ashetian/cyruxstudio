import fs from "fs";
import path from "path";
import { put, del, list } from "@vercel/blob";

export const ALLOWED_BLOB_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/quicktime",
] as const;

export type AllowedBlobMimeType = (typeof ALLOWED_BLOB_MIME_TYPES)[number];

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

export interface BlobDeleteResult {
  success: boolean;
  deletedUrl: string;
}

export interface BlobListItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  contentType?: string;
}

// In-memory registry for mock/offline resilience
const mockBlobRegistry = new Map<string, BlobUploadResult & { uploadedAt: Date }>();

export function isVercelBlobConfigured(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return Boolean(token && token.trim().length > 0 && !token.includes("dummy"));
}

export function validateUploadFile(file: { name: string; type: string; size: number }): {
  isVideo: boolean;
  limit: number;
} {
  if (!ALLOWED_BLOB_MIME_TYPES.includes(file.type as AllowedBlobMimeType)) {
    throw new Error(
      `Unsupported media type: ${file.type}. Allowed: ${ALLOWED_BLOB_MIME_TYPES.join(", ")}`
    );
  }

  const isVideo = file.type.startsWith("video/");
  const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > limit) {
    throw new Error(`File size ${file.size} exceeds maximum limit of ${limit} bytes`);
  }

  return { isVideo, limit };
}

export function isSafeLocalUploadUrl(rawUrl: string): {
  valid: boolean;
  filename?: string;
  error?: string;
} {
  if (!rawUrl.startsWith("/uploads/")) {
    return { valid: false, error: "Not a local upload URL" };
  }
  if (
    rawUrl.includes("..") ||
    rawUrl.includes("\\") ||
    rawUrl.includes("?") ||
    rawUrl.includes("#") ||
    rawUrl.includes("\0") ||
    /%2e|%2f|%5c/i.test(rawUrl)
  ) {
    return { valid: false, error: "Path traversal sequence detected in local upload URL" };
  }

  const filename = rawUrl.slice("/uploads/".length);
  if (
    !filename ||
    filename.includes("/") ||
    path.basename(filename) !== filename ||
    !/^[a-zA-Z0-9._-]+$/.test(filename)
  ) {
    return { valid: false, error: "Invalid local upload filename" };
  }

  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  const targetPath = path.resolve(uploadsDir, filename);
  if (!targetPath.startsWith(uploadsDir + path.sep)) {
    return { valid: false, error: "Path traversal outside uploads directory" };
  }

  return { valid: true, filename };
}

export function validateDeleteUrl(rawUrl: string): { url: string; pathname: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("URL is required");
  }

  if (rawUrl.startsWith("/uploads/")) {
    const check = isSafeLocalUploadUrl(rawUrl);
    if (!check.valid || !check.filename) {
      throw new Error(check.error || "Path traversal or invalid local upload path detected");
    }
    return { url: rawUrl, pathname: `uploads/${check.filename}` };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS Vercel Blob URLs are permitted");
  }

  if (!parsed.hostname.endsWith(".blob.vercel-storage.com")) {
    throw new Error(
      "Only Vercel Blob URLs (*.blob.vercel-storage.com) can be deleted via this endpoint"
    );
  }

  if (parsed.pathname.includes("..") || rawUrl.includes("..")) {
    throw new Error("Path traversal sequence detected in blob URL");
  }

  return { url: rawUrl, pathname: parsed.pathname };
}

export async function uploadBlob(
  file: File | Blob | Buffer,
  filename: string,
  contentType: string
): Promise<BlobUploadResult> {
  const size = Buffer.isBuffer(file) ? file.length : (file as Blob).size;
  validateUploadFile({ name: filename, type: contentType, size });

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `uploads/${Date.now()}-${sanitizedFilename}`;

  if (isVercelBlobConfigured()) {
    const blob = await put(pathname, file, {
      access: "public",
      contentType,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType,
      size,
    };
  }

  // Local / offline fallback: persist file to public/uploads for direct browser availability
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFilename = `${Date.now()}-${sanitizedFilename}`;
    const filePath = path.join(uploadsDir, localFilename);
    const buf = Buffer.isBuffer(file)
      ? file
      : Buffer.from(await (file as Blob).arrayBuffer());
    fs.writeFileSync(filePath, buf);
    const localUrl = `/uploads/${localFilename}`;
    const result: BlobUploadResult = {
      url: localUrl,
      pathname: `uploads/${localFilename}`,
      contentType,
      size,
    };
    mockBlobRegistry.set(localUrl, { ...result, uploadedAt: new Date() });
    return result;
  } catch (err) {
    console.warn("[uploadBlob] Local write failed, falling back to mock URL", err);
    const mockUrl = `https://cyrux-store.public.blob.vercel-storage.com/${Date.now()}-${sanitizedFilename}`;
    const result: BlobUploadResult = {
      url: mockUrl,
      pathname,
      contentType,
      size,
    };
    mockBlobRegistry.set(mockUrl, { ...result, uploadedAt: new Date() });
    return result;
  }
}

export async function deleteBlob(url: string): Promise<BlobDeleteResult> {
  const validated = validateDeleteUrl(url);

  if (url.startsWith("/uploads/")) {
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const targetPath = path.resolve(uploadsDir, path.basename(validated.pathname));
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      throw new Error("Path traversal outside uploads directory");
    }
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch (err) {
      console.warn("[deleteBlob] Failed to unlink local upload:", err);
    }
    mockBlobRegistry.delete(url);
    return { success: true, deletedUrl: url };
  }

  if (isVercelBlobConfigured()) {
    await del(url);
    mockBlobRegistry.delete(url);
    return { success: true, deletedUrl: url };
  }

  // Mock deletion
  mockBlobRegistry.delete(url);
  return { success: true, deletedUrl: url };
}

function guessContentTypeFromFilename(filename: string): string | undefined {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  return undefined;
}

export async function listAllBlobs(): Promise<BlobListItem[]> {
  if (isVercelBlobConfigured()) {
    try {
      const response = await list();
      return response.blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      }));
    } catch {
      // Fallback on network probe failure
    }
  }

  const byUrl = new Map<string, BlobListItem>();

  for (const item of mockBlobRegistry.values()) {
    byUrl.set(item.url, {
      url: item.url,
      pathname: item.pathname,
      size: item.size,
      uploadedAt: item.uploadedAt,
      contentType: item.contentType,
    });
  }

  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (fs.existsSync(uploadsDir)) {
      const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || entry.name.startsWith(".")) continue;
        const fullPath = path.join(uploadsDir, entry.name);
        const stat = fs.statSync(fullPath);
        const url = `/uploads/${entry.name}`;
        byUrl.set(url, {
          url,
          pathname: `uploads/${entry.name}`,
          size: stat.size,
          uploadedAt: stat.mtime,
          contentType: guessContentTypeFromFilename(entry.name),
        });
      }
    }
  } catch (err) {
    console.warn("[listAllBlobs] Failed to scan public/uploads:", err);
  }

  return Array.from(byUrl.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}
