import { describe, it, expect } from '../framework.ts';
import { ALLOWED_BLOB_MIME_TYPES } from '../contracts.ts';

describe('Feature 16: Authenticated Vercel Blob Storage', () => {
  const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

  const validateUploadFile = (file: { name: string; type: string; size: number }) => {
    if (!ALLOWED_BLOB_MIME_TYPES.includes(file.type)) {
      throw new Error(`Unsupported media type: ${file.type}. Allowed: ${ALLOWED_BLOB_MIME_TYPES.join(', ')}`);
    }

    const isVideo = file.type.startsWith('video/');
    const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > limit) {
      throw new Error(`File size ${file.size} exceeds maximum limit of ${limit} bytes`);
    }

    return {
      url: `https://cyrux-store.public.blob.vercel-storage.com/${Date.now()}-${file.name}`,
      pathname: `uploads/${file.name}`,
      contentType: file.type,
      size: file.size,
    };
  };

  const validateDeleteRequest = (payload: { url: string }) => {
    if (!payload.url || typeof payload.url !== 'string') {
      throw new Error('URL is required');
    }
    let parsed: URL;
    try {
      parsed = new URL(payload.url);
    } catch {
      throw new Error('Invalid URL format');
    }
    if (!parsed.hostname.includes('.blob.vercel-storage.com')) {
      throw new Error('Only Vercel Blob URLs (*.blob.vercel-storage.com) can be deleted via this endpoint');
    }
    return { success: true, deletedUrl: payload.url };
  };

  it('16.1 should accept valid image upload (WebP, 2MB)', () => {
    const file = {
      name: 'hoodie-front.webp',
      type: 'image/webp',
      size: 2 * 1024 * 1024,
    };

    const result = validateUploadFile(file);
    expect(result.url).toContain('.blob.vercel-storage.com');
    expect(result.contentType).toBe('image/webp');
    expect(result.size).toBe(2 * 1024 * 1024);
  });

  it('16.2 should accept valid video upload (MP4, 30MB)', () => {
    const file = {
      name: 'campaign-video.mp4',
      type: 'video/mp4',
      size: 30 * 1024 * 1024,
    };

    const result = validateUploadFile(file);
    expect(result.url).toContain('.blob.vercel-storage.com');
    expect(result.contentType).toBe('video/mp4');
  });

  it('16.3 should reject disallowed MIME types (e.g. text/html, application/x-msdownload, exe)', () => {
    expect(() =>
      validateUploadFile({
        name: 'payload.html',
        type: 'text/html',
        size: 1024,
      })
    ).toThrow('Unsupported media type: text/html');

    expect(() =>
      validateUploadFile({
        name: 'malware.exe',
        type: 'application/octet-stream',
        size: 5000,
      })
    ).toThrow('Unsupported media type');
  });

  it('16.4 should reject files exceeding size limits (e.g. 20MB image)', () => {
    expect(() =>
      validateUploadFile({
        name: 'massive-image.png',
        type: 'image/png',
        size: 20 * 1024 * 1024, // 20MB > 15MB limit
      })
    ).toThrow('exceeds maximum limit');
  });

  it('16.5 should validate Vercel Blob deletion domain and reject non-blob URLs', () => {
    const validBlobUrl = 'https://cyrux-store.public.blob.vercel-storage.com/asset-123.png';
    const deleteValid = validateDeleteRequest({ url: validBlobUrl });
    expect(deleteValid.success).toBe(true);

    const maliciousUrl = 'https://attacker.com/malicious-file.png';
    expect(() => validateDeleteRequest({ url: maliciousUrl })).toThrow('Only Vercel Blob URLs');
  });
}, { tier: 1, featureId: 16 });
