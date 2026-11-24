import { z } from "zod";

/**
 * Sanitizes customer-provided text to prevent HTML/XSS and script injection.
 * Strips HTML tags (<...>) and injection delimiters ('";\).
 */
export function sanitizeCustomerText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Strip complete HTML tags
    .replace(/[<>]/g, "") // Strip any dangling angle brackets
    .replace(/['";\\]/g, "") // Strip script/SQL injection characters
    .trim();
}

/**
 * Zod schema for full WhatsApp order input (client & server-side generation)
 */
export const whatsAppOrderInputSchema = z.object({
  productId: z
    .string({
      required_error: "productId is required and cannot be empty",
      invalid_type_error: "productId is required and cannot be empty",
    })
    .trim()
    .min(1, "productId is required and cannot be empty"),

  productName: z
    .string({
      required_error: "productName is required and cannot be empty",
      invalid_type_error: "productName must be a string",
    })
    .trim()
    .min(1, "productName is required and cannot be empty")
    .max(200, "productName cannot exceed 200 characters"),

  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),

  price: z
    .number({
      required_error: "Price must be a positive number",
      invalid_type_error: "Price must be a positive number",
    })
    .positive("Price must be a positive number")
    .finite("Price must be a finite number"),

  currency: z
    .string({
      invalid_type_error: "currency must be a 3-letter currency code",
    })
    .trim()
    .toUpperCase()
    .min(3, "currency must be 3 characters")
    .max(4, "currency must not exceed 4 characters")
    .default("USD"),

  customerNotes: z
    .string({
      invalid_type_error: "customerNotes must be a string",
    })
    .max(500, "customerNotes cannot exceed 500 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),

  timestamp: z.union([z.string(), z.date()]).optional(),
  lang: z.enum(["tr", "en"]).optional(),
});

export type WhatsAppOrderInput = z.infer<typeof whatsAppOrderInputSchema>;

/**
 * Zod schema for POST /api/order/whatsapp request payloads
 */
export const whatsAppOrderApiRequestSchema = z.object({
  productId: z
    .string({
      required_error: "productId is required and cannot be empty",
      invalid_type_error: "productId is required and cannot be empty",
    })
    .trim()
    .min(1, "productId is required and cannot be empty"),

  productName: z
    .string({
      invalid_type_error: "productName must be a string",
    })
    .trim()
    .min(1, "productName cannot be empty")
    .max(200, "productName cannot exceed 200 characters")
    .optional(),

  variant: z
    .string({
      invalid_type_error: "variant must be a string up to 50 characters",
    })
    .max(50, "variant must be a string up to 50 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),

  price: z
    .number({
      invalid_type_error: "Price must be a positive number",
    })
    .positive("Price must be a positive number")
    .finite("Price must be a finite number")
    .optional(),

  currency: z
    .string({
      invalid_type_error: "currency must be a 3-letter currency code",
    })
    .trim()
    .toUpperCase()
    .min(3, "currency must be 3 characters")
    .max(4, "currency must not exceed 4 characters")
    .optional(),

  customerNotes: z
    .string({
      invalid_type_error: "customerNotes must be a string",
    })
    .max(500, "customerNotes cannot exceed 500 characters")
    .transform((val) => {
      const cleaned = sanitizeCustomerText(val);
      return cleaned === "" ? undefined : cleaned;
    })
    .optional(),

  lang: z.enum(["tr", "en"]).optional(),
  customerName: z
    .string()
    .trim()
    .max(120)
    .transform((v) => sanitizeCustomerText(v) || undefined)
    .optional(),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => sanitizeCustomerText(v) || undefined)
    .optional(),
  customerEmail: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  shippingAddress: z
    .string()
    .trim()
    .max(400)
    .transform((v) => sanitizeCustomerText(v) || undefined)
    .optional(),
  couponCode: z
    .string()
    .trim()
    .max(50)
    .transform((v) => sanitizeCustomerText(v).toUpperCase() || undefined)
    .optional(),
});

export type WhatsAppOrderApiRequest = z.infer<typeof whatsAppOrderApiRequestSchema>;

/**
 * Direct validation helper for WhatsApp order payloads.
 * Validates root object, non-empty productId, variant length, and customerNotes length & XSS sanitization.
 * Throws descriptive errors matching the validation contracts.
 */
export function validateOrderPayload(input: unknown): {
  productId: string;
  variant?: string;
  customerNotes?: string;
  price?: number;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload must be an object");
  }

  const raw = input as Record<string, unknown>;

  if (
    raw.productId === undefined ||
    raw.productId === null ||
    typeof raw.productId !== "string" ||
    raw.productId.trim() === ""
  ) {
    throw new Error("productId is required and cannot be empty");
  }

  if (raw.variant !== undefined && raw.variant !== null) {
    if (typeof raw.variant !== "string" || raw.variant.length > 50) {
      throw new Error("variant must be a string up to 50 characters");
    }
  }

  if (raw.price !== undefined && raw.price !== null) {
    if (typeof raw.price !== "number" || isNaN(raw.price) || raw.price <= 0 || !isFinite(raw.price)) {
      throw new Error("Price must be a positive number");
    }
  }

  if (raw.customerNotes !== undefined && raw.customerNotes !== null) {
    if (typeof raw.customerNotes !== "string") {
      throw new Error("customerNotes must be a string");
    }
    if (raw.customerNotes.length > 500) {
      throw new Error("customerNotes cannot exceed 500 characters");
    }
  }

  return {
    productId: raw.productId.trim(),
    variant:
      typeof raw.variant === "string"
        ? sanitizeCustomerText(raw.variant) || undefined
        : undefined,
    customerNotes:
      typeof raw.customerNotes === "string"
        ? sanitizeCustomerText(raw.customerNotes) || undefined
        : undefined,
    price: typeof raw.price === "number" ? raw.price : undefined,
  };
}

// =============================================================================
// Helper Sanitizers
// =============================================================================
export function sanitizeAdminText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[<>]/g, "")
    .trim();
}

export function sanitizeCmsUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^data:(image\/(jpeg|png|webp|avif|gif)|video\/(mp4|quicktime|webm));base64,[a-zA-Z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return "";
  }
  if (trimmed.startsWith("//")) {
    return "";
  }
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }
  return "";
}

// =============================================================================
// Feature 13: Admin Auth Schema
// =============================================================================
export const adminLoginSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
    })
    .trim()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters"),
  password: z
    .string({
      required_error: "Password is required",
      invalid_type_error: "Password must be a string",
    })
    .min(1, "Password is required")
    .max(255, "Password cannot exceed 255 characters"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const adminFlexibleLoginSchema = z
  .object({
    email: z.string().trim().max(255).optional(),
    username: z.string().trim().max(255).optional(),
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
      })
      .min(1, "Password is required")
      .max(255, "Password cannot exceed 255 characters"),
  })
  .refine(
    (data) =>
      Boolean(
        (data.email && data.email.trim().length > 0) ||
          (data.username && data.username.trim().length > 0)
      ),
    {
      message: "Email or username is required",
      path: ["email"],
    }
  );

export type AdminFlexibleLoginInput = z.infer<typeof adminFlexibleLoginSchema>;

// =============================================================================
// Feature 14: Product CRUD Zod Schemas
// =============================================================================

export const allowedSlugRegex = /^[a-z0-9-]+$/;

const productVariantObjectSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    inStock: z.boolean().optional(),
    sku: z.string().optional(),
    priceModifier: z.number().optional(),
    size: z.string().optional(),
    stock: z.number().int().min(0, "Stock must be >= 0").optional(),
    color: z.string().optional(),
    colorHex: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .refine(
    (v) =>
      (typeof v.name === "string" && v.name.trim().length > 0) ||
      (typeof v.size === "string" &&
        v.size.trim().length > 0 &&
        v.stock !== undefined),
    {
      message: "Variant must include name or size with stock",
    }
  )
  .transform((v) => {
    const trimmedColor = v.color?.trim() || "";
    const trimmedSize = v.size?.trim() || "";
    const resolvedName =
      v.name && v.name.trim().length > 0
        ? v.name.trim()
        : trimmedColor && trimmedSize
        ? `${trimmedColor.toUpperCase()} / ${trimmedSize}`
        : trimmedSize;
    const resolvedInStock =
      v.inStock !== undefined
        ? v.inStock
        : v.stock !== undefined
        ? v.stock > 0
        : true;
    return {
      ...v,
      name: resolvedName,
      inStock: resolvedInStock,
    };
  });

export const productVariantItemSchema = z.union([
  z.object({
    _metadata: z.record(z.unknown()),
  }),
  productVariantObjectSchema,
]);

export const adminProductCreateSchema = z
  .object({
    name: z.string().trim().optional(),
    title: z.string().trim().optional(),
    slug: z
      .string({
        required_error: "Slug is required",
        invalid_type_error: "Slug must be a string",
      })
      .trim()
      .regex(allowedSlugRegex, "Slug must be URL-safe lowercase with hyphens"),
    price: z
      .number({
        required_error: "Price is required",
        invalid_type_error: "Price must be a number",
      })
      .refine((val) => val > 0, {
        message: "Price must be greater than zero",
      }),
    discountPrice: z
      .number()
      .positive("Discount price must be positive")
      .finite("Discount price must be finite")
      .nullable()
      .optional(),
    stock: z
      .number({
        required_error: "Stock is required",
        invalid_type_error: "Stock must be an integer",
      })
      .int("Stock must be an integer")
      .min(0, "Stock must be >= 0")
      .default(0),
    description: z
      .string()
      .trim()
      .default("")
      .transform((v) => sanitizeAdminText(v)),
    variants: z.array(productVariantItemSchema).default([]),
    mediaUrls: z.array(z.string().trim()).default([]),
    images: z.array(z.string().trim()).optional(),
    isBestseller: z.boolean().default(false),
    color: z.string().trim().nullable().optional(),
    colorHex: z.string().trim().nullable().optional(),
    twinProductSlug: z.string().trim().nullable().optional(),
    isDiptych: z.boolean().default(false),
    badge: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .optional()
      .transform((v) =>
        v === null ? null : v ? sanitizeAdminText(v) || null : undefined
      ),
    category: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v ? sanitizeAdminText(v) : undefined)),
    sku: z
      .string()
      .trim()
      .max(60)
      .nullable()
      .optional()
      .transform((v) => (v === null ? null : v ? sanitizeAdminText(v) : undefined)),
    collectionId: z.string().trim().min(1).nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.name && data.name.trim().length > 0) ||
          (data.title && data.title.trim().length > 0)
      ),
    {
      message: "Name is required",
      path: ["name"],
    }
  )
  .refine(
    (data) => data.discountPrice == null || data.discountPrice < data.price,
    {
      message: "Discount price must be less than price",
      path: ["discountPrice"],
    }
  )
  .transform((data) => {
    const resolvedName = sanitizeAdminText(data.name || data.title || "");
    const resolvedMedia =
      data.mediaUrls.length > 0 ? data.mediaUrls : data.images || [];
    const isBestsellerResolved = Boolean(
      data.isBestseller ||
        (data.badge && data.badge.toUpperCase() === "BESTSELLER")
    );
    const resolvedBadge =
      data.badge !== undefined
        ? data.badge
        : isBestsellerResolved
        ? "BESTSELLER"
        : null;
    return {
      ...data,
      name: resolvedName,
      title: resolvedName,
      mediaUrls: resolvedMedia,
      images: resolvedMedia,
      isBestseller: isBestsellerResolved,
      badge: resolvedBadge,
    };
  });

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;

export const adminProductUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").optional(),
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    slug: z
      .string()
      .trim()
      .regex(allowedSlugRegex, "Slug must be URL-safe lowercase with hyphens")
      .optional(),
    price: z
      .number()
      .refine((val) => val > 0, {
        message: "Price must be positive",
      })
      .optional(),
    discountPrice: z
      .number()
      .positive("Discount price must be positive")
      .finite("Discount price must be finite")
      .nullable()
      .optional(),
    stock: z
      .number()
      .int("Stock must be an integer")
      .min(0, "Stock must be >= 0")
      .optional(),
    description: z
      .string()
      .trim()
      .transform((v) => sanitizeAdminText(v))
      .optional(),
    variants: z.array(productVariantItemSchema).optional(),
    mediaUrls: z.array(z.string().trim()).optional(),
    images: z.array(z.string().trim()).optional(),
    isBestseller: z.boolean().optional(),
    color: z.string().trim().nullable().optional(),
    colorHex: z.string().trim().nullable().optional(),
    twinProductSlug: z.string().trim().nullable().optional(),
    isDiptych: z.boolean().optional(),
    badge: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .optional()
      .transform((v) =>
        v === null ? null : v ? sanitizeAdminText(v) || null : undefined
      ),
    category: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v ? sanitizeAdminText(v) : undefined)),
    sku: z
      .string()
      .trim()
      .max(60)
      .nullable()
      .optional()
      .transform((v) => (v === null ? null : v ? sanitizeAdminText(v) : undefined)),
    collectionId: z.string().trim().min(1).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .transform((data) => {
    const resolvedName = data.name || data.title;
    const resolvedMedia = data.mediaUrls || data.images;
    const isBestsellerResolved =
      data.isBestseller !== undefined
        ? data.isBestseller
        : data.badge !== undefined && data.badge !== null
        ? data.badge.toUpperCase() === "BESTSELLER"
          ? true
          : undefined
        : undefined;

    return {
      ...data,
      ...(resolvedName
        ? {
            name: sanitizeAdminText(resolvedName),
            title: sanitizeAdminText(resolvedName),
          }
        : {}),
      ...(resolvedMedia
        ? { mediaUrls: resolvedMedia, images: resolvedMedia }
        : {}),
      ...(isBestsellerResolved !== undefined
        ? { isBestseller: isBestsellerResolved }
        : {}),
    };
  });

export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;

// =============================================================================
// Feature 15: Store Settings Zod Schemas
// =============================================================================

export const ALLOWED_CURRENCIES = ["USD", "EUR", "TRY", "GBP"] as const;

export const adminSettingsUpdateSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const cleaned = val.replace(/[\s()-]/g, "");
        return /^\+\d{10,15}$/.test(cleaned);
      },
      {
        message:
          "whatsappNumber must be a valid E.164 formatted number starting with +",
      }
    )
    .transform((val) => (val ? val.replace(/[\s()-]/g, "") : undefined)),

  currency: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return (ALLOWED_CURRENCIES as readonly string[]).includes(
          val.toUpperCase()
        );
      },
      {
        message: "currency must be one of: USD, EUR, TRY, GBP",
      }
    )
    .transform((val) => (val ? val.toUpperCase() : undefined)),

  storeName: z
    .string()
    .trim()
    .max(100)
    .transform((v) => sanitizeAdminText(v))
    .optional(),
  brandBio: z
    .string()
    .trim()
    .max(500)
    .transform((v) => sanitizeAdminText(v))
    .optional(),
  announcement: z
    .string()
    .trim()
    .max(300)
    .transform((v) => sanitizeAdminText(v))
    .optional(),
  socialLinks: z.record(z.string()).optional(),
  socialHandles: z.record(z.string()).optional(),
  brandMetadata: z.record(z.unknown()).optional(),
  heroDesktopImage: z.string().trim().optional(),
  heroMobileImage: z.string().trim().optional(),
  aboutDesktopImage: z.string().trim().optional(),
  aboutMobileImage: z.string().trim().optional(),
  freeShippingThreshold: z.number().min(0).finite().nullable().optional(),
  shippingFee: z.number().min(0).finite().nullable().optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
  activeTheme: z.enum(["light", "dark", "atelier", "white-atelier"]).optional(),
  announcementEnabled: z.boolean().optional(),
  defaultLang: z.enum(["tr", "en"]).optional(),
  supportEmail: z
    .string()
    .trim()
    .email("Invalid support email")
    .max(255)
    .optional()
    .or(z.literal("")),
  whatsappFormatted: z
    .string()
    .trim()
    .max(60)
    .transform((v) => sanitizeAdminText(v))
    .optional(),
  location: z
    .string()
    .trim()
    .max(150)
    .transform((v) => sanitizeAdminText(v))
    .optional(),
});

export const adminStoreSettingsUpdateSchema = adminSettingsUpdateSchema;
export type AdminSettingsUpdateInput = z.infer<typeof adminSettingsUpdateSchema>;

// =============================================================================
// Feature 16: Blob Storage Schemas
// =============================================================================

export const blobDeleteSchema = z.object({
  url: z
    .string({
      required_error: "URL is required",
      invalid_type_error: "URL must be a string",
    })
    .trim()
    .min(1, "URL is required")
    .refine(
      (val) => {
        if (val.startsWith("/uploads/")) {
          return (
            !val.includes("..") &&
            !/[\\?#\0]/.test(val) &&
            !/%2e|%2f|%5c/i.test(val) &&
            /^\/uploads\/[a-zA-Z0-9._-]+$/.test(val)
          );
        }
        try {
          const u = new URL(val);
          return (
            u.protocol === "https:" &&
            u.hostname.endsWith(".blob.vercel-storage.com") &&
            !u.pathname.includes("..") &&
            !val.includes("..")
          );
        } catch {
          return false;
        }
      },
      {
        message:
          "Only Vercel Blob URLs (*.blob.vercel-storage.com) or local /uploads/ assets can be deleted via this endpoint",
      }
    ),
});

export type BlobDeleteInput = z.infer<typeof blobDeleteSchema>;

// =============================================================================
// Product Response Normalizer
// =============================================================================
export function normalizeProductResponse(p: {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  stock?: number;
  variants?: unknown;
  mediaUrls?: string[];
  images?: string[];
  isBestseller?: boolean;
  badge?: string | null;
  category?: string;
  sku?: string | null;
  collectionId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}) {
  const name = p.name || p.title || "";
  const mediaUrls = Array.isArray(p.mediaUrls)
    ? p.mediaUrls
    : Array.isArray(p.images)
    ? p.images
    : [];
  const isBestseller = Boolean(
    p.isBestseller || (typeof p.badge === "string" && p.badge.toUpperCase() === "BESTSELLER")
  );
  const rawVariants = Array.isArray(p.variants) ? p.variants : [];

  let category = p.category as string | undefined;
  if (!category) {
    const metaVariant = rawVariants.find(
      (v) => v && typeof v === "object" && "_metadata" in v
    ) as { _metadata?: { category?: string } } | undefined;
    if (metaVariant?._metadata?.category) {
      category = metaVariant._metadata.category;
    }
  }

  const variants = rawVariants.filter(
    (v) => !(v && typeof v === "object" && "_metadata" in v)
  );

  const badge =
    p.badge !== undefined
      ? p.badge
      : isBestseller
      ? "BESTSELLER"
      : null;

  return {
    id: p.id,
    name,
    title: name,
    slug: p.slug,
    description: p.description || "",
    price: Number(p.price),
    discountPrice:
      p.discountPrice !== undefined && p.discountPrice !== null
        ? Number(p.discountPrice)
        : null,
    stock: Number(p.stock || 0),
    variants,
    mediaUrls,
    images: mediaUrls,
    isBestseller,
    badge,
    category: category || "apparel",
    sku: (p.sku as string) || null,
    collectionId: (p.collectionId as string) || null,
    sortOrder: typeof p.sortOrder === "number" ? p.sortOrder : 0,
    isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
    color: (p.color as string) || null,
    colorHex: (p.colorHex as string) || null,
    twinProductSlug: (p.twinProductSlug as string) || null,
    isDiptych: Boolean(p.isDiptych),
    createdAt: p.createdAt
      ? new Date(p.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: p.updatedAt
      ? new Date(p.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Zod schema for POST /api/order/whatsapp-cart request payloads.
 * Prices are never accepted from the client; they are resolved from the DB.
 */
export const whatsAppCartApiRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, "productId is required"),
        variant: z
          .string()
          .trim()
          .max(100, "variant cannot exceed 100 characters")
          .optional()
          .transform((v) => (v ? sanitizeCustomerText(v) || undefined : undefined)),
        quantity: z
          .number({ invalid_type_error: "quantity must be a number" })
          .int("quantity must be an integer")
          .min(1, "quantity must be at least 1")
          .max(20, "quantity cannot exceed 20"),
      })
    )
    .min(1, "Cart is empty")
    .max(30, "Cart cannot exceed 30 lines"),
  customerNotes: z
    .string()
    .trim()
    .max(500, "customerNotes cannot exceed 500 characters")
    .optional()
    .transform((v) => (v ? sanitizeCustomerText(v) || undefined : undefined)),
  lang: z.enum(["tr", "en"]).optional(),
  customerName: z
    .string()
    .trim()
    .max(120)
    .transform((v) => sanitizeCustomerText(v) || undefined)
    .optional(),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => sanitizeCustomerText(v) || undefined)
    .optional(),
  customerEmail: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  shippingAddress: z
    .string()
    .trim()
    .max(400)
    .transform((v) => sanitizeCustomerText(v) || undefined)
    .optional(),
  couponCode: z
    .string()
    .trim()
    .max(50)
    .transform((v) => sanitizeCustomerText(v).toUpperCase() || undefined)
    .optional(),
});

export type WhatsAppCartApiRequest = z.infer<typeof whatsAppCartApiRequestSchema>;

// =============================================================================
// Phase 2 Commerce Schemas (Collections, Orders, Customers, Coupons, Drops)
// =============================================================================

export const localizedTextSchema = z.object({
  tr: z.string().trim().max(5000).transform(sanitizeAdminText),
  en: z.string().trim().max(5000).transform(sanitizeAdminText),
});

export const adminCollectionCreateSchema = z.object({
  name: z.union([
    z.string().trim().min(1, "Collection name is required").max(120).transform(sanitizeAdminText),
    localizedTextSchema,
  ]),
  slug: z
    .string({ required_error: "Slug is required" })
    .trim()
    .regex(allowedSlugRegex, "Slug must be URL-safe lowercase with hyphens"),
  description: z
    .union([
      z.string().trim().max(2000).transform(sanitizeAdminText),
      localizedTextSchema,
    ])
    .optional(),
  imageUrl: z.string().trim().max(500).optional().default(""),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().trim()).optional(),
});

export const adminCollectionUpdateSchema = adminCollectionCreateSchema.partial();

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const adminOrderItemInputSchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
  productName: z
    .string()
    .trim()
    .max(200)
    .transform(sanitizeCustomerText)
    .optional(),
  variantName: z
    .string()
    .trim()
    .max(100)
    .transform(sanitizeCustomerText)
    .optional(),
  quantity: z.number().int().min(1).max(100),
  unitPrice: z.number().nonnegative().finite().optional(),
});

export const adminOrderCreateSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(120)
    .transform(sanitizeCustomerText),
  customerPhone: z
    .string()
    .trim()
    .min(5, "Customer phone is required")
    .max(30)
    .transform(sanitizeCustomerText),
  customerEmail: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  shippingAddress: z
    .string()
    .trim()
    .max(500)
    .transform(sanitizeCustomerText)
    .optional(),
  customerNotes: z
    .string()
    .trim()
    .max(500)
    .transform(sanitizeCustomerText)
    .optional(),
  adminNotes: z
    .string()
    .trim()
    .max(1000)
    .transform(sanitizeAdminText)
    .optional(),
  couponCode: z
    .string()
    .trim()
    .max(32)
    .transform((v) => sanitizeCustomerText(v).toUpperCase())
    .optional(),
  status: z.enum(ORDER_STATUSES).default("pending"),
  subtotal: z.number().nonnegative().finite().optional(),
  total: z.number().nonnegative().finite().optional(),
  items: z.array(adminOrderItemInputSchema).min(1, "Order must have at least one item"),
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  trackingNumber: z
    .string()
    .trim()
    .max(100)
    .transform(sanitizeAdminText)
    .nullable()
    .optional(),
  trackingCarrier: z
    .string()
    .trim()
    .max(80)
    .transform(sanitizeAdminText)
    .nullable()
    .optional(),
  adminNotes: z
    .string()
    .trim()
    .max(1000)
    .transform(sanitizeAdminText)
    .nullable()
    .optional(),
  shippingAddress: z
    .string()
    .trim()
    .max(500)
    .transform(sanitizeCustomerText)
    .nullable()
    .optional(),
  customerNotes: z
    .string()
    .trim()
    .max(500)
    .transform(sanitizeCustomerText)
    .nullable()
    .optional(),
});

export const adminCustomerCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(120)
    .transform(sanitizeCustomerText),
  phone: z
    .string()
    .trim()
    .min(5, "Phone number is required")
    .max(30)
    .transform(sanitizeCustomerText),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal(""))
    .nullable(),
  city: z
    .string()
    .trim()
    .max(100)
    .transform(sanitizeCustomerText)
    .optional()
    .nullable(),
  address: z
    .string()
    .trim()
    .max(500)
    .transform(sanitizeCustomerText)
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform(sanitizeAdminText)
    .optional()
    .nullable(),
});

export const adminCustomerUpdateSchema = adminCustomerCreateSchema.partial();

export const COUPON_DISCOUNT_TYPES = ["percentage", "fixed"] as const;

const couponBaseObjectSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_-]{2,32}$/,
      "Coupon code must be 2-32 alphanumeric, dash, or underscore characters"
    ),
  title: z
    .union([
      z.string().trim().max(120).transform(sanitizeAdminText),
      localizedTextSchema,
    ])
    .optional(),
  discountType: z.enum(COUPON_DISCOUNT_TYPES),
  discountValue: z.number().positive("Discount value must be > 0").finite(),
  minOrderAmount: z.number().min(0).finite().nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  usedCount: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  startsAt: z.union([z.string(), z.date()]).nullable().optional(),
  expiresAt: z.union([z.string(), z.date()]).nullable().optional(),
});

export const adminCouponCreateSchema = couponBaseObjectSchema.refine(
  (data) => data.discountType !== "percentage" || data.discountValue <= 100,
  {
    message: "Percentage discount cannot exceed 100",
    path: ["discountValue"],
  }
);

export const adminCouponUpdateSchema = couponBaseObjectSchema
  .partial()
  .refine(
    (data) =>
      data.discountType !== "percentage" ||
      data.discountValue === undefined ||
      data.discountValue <= 100,
    {
      message: "Percentage discount cannot exceed 100",
      path: ["discountValue"],
    }
  );

export const couponValidateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Coupon code is required")
    .max(50)
    .transform((v) => sanitizeCustomerText(v).toUpperCase()),
  subtotal: z.number().nonnegative("Subtotal must be >= 0").finite(),
});

export const adminDropSchema = z.object({
  id: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  number: z.string().trim().min(1, "Drop number is required").max(20).transform(sanitizeAdminText),
  chapter: z.string().trim().min(1, "Chapter is required").max(80).transform(sanitizeAdminText),
  title: z.string().trim().min(1, "Title is required").max(120).transform(sanitizeAdminText),
  status: z.enum(["active", "archived", "upcoming"]).default("upcoming"),
  releaseDate: localizedTextSchema.optional(),
  edition: localizedTextSchema.optional(),
  description: localizedTextSchema.optional(),
  productSlugs: z.array(z.string().trim()).optional(),
  bannerImage: z.string().trim().max(500).optional(),
  totalPieces: z.number().int().min(0).optional(),
});
