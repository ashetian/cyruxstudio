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
    .trim();
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

// =============================================================================
// Feature 14: Product CRUD Zod Schemas
// =============================================================================

export const allowedSlugRegex = /^[a-z0-9-]+$/;

export const productVariantItemSchema = z.union([
  z.object({
    id: z.string().optional(),
    name: z.string(),
    inStock: z.boolean().default(true),
    sku: z.string().optional(),
    priceModifier: z.number().optional(),
  }),
  z.object({
    size: z.string(),
    stock: z.number().int().min(0, "Stock must be >= 0"),
  }),
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
    stock: z
      .number({
        required_error: "Stock is required",
        invalid_type_error: "Stock must be an integer",
      })
      .int("Stock must be an integer")
      .min(0, "Stock must be >= 0")
      .default(0),
    description: z.string().trim().default(""),
    variants: z.array(productVariantItemSchema).default([]),
    mediaUrls: z.array(z.string().trim()).default([]),
    images: z.array(z.string().trim()).optional(),
    isBestseller: z.boolean().default(false),
    badge: z.string().optional(),
    category: z.string().optional(),
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
  .transform((data) => {
    const resolvedName = sanitizeAdminText(data.name || data.title || "");
    const resolvedMedia =
      data.mediaUrls.length > 0 ? data.mediaUrls : data.images || [];
    const isBestsellerResolved = Boolean(
      data.isBestseller ||
        (data.badge && data.badge.toUpperCase() === "BESTSELLER")
    );
    return {
      ...data,
      name: resolvedName,
      title: resolvedName,
      mediaUrls: resolvedMedia,
      images: resolvedMedia,
      isBestseller: isBestsellerResolved,
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
    stock: z
      .number()
      .int("Stock must be an integer")
      .min(0, "Stock must be >= 0")
      .optional(),
    description: z.string().trim().optional(),
    variants: z.array(productVariantItemSchema).optional(),
    mediaUrls: z.array(z.string().trim()).optional(),
    images: z.array(z.string().trim()).optional(),
    isBestseller: z.boolean().optional(),
    badge: z.string().optional(),
    category: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .transform((data) => {
    const resolvedName = data.name || data.title;
    const resolvedMedia = data.mediaUrls || data.images;
    const isBestsellerResolved =
      data.isBestseller !== undefined
        ? data.isBestseller
        : data.badge !== undefined
        ? data.badge.toUpperCase() === "BESTSELLER"
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

  storeName: z.string().trim().max(100).optional(),
  brandBio: z.string().trim().max(500).optional(),
  socialLinks: z.record(z.string()).optional(),
  brandMetadata: z.record(z.unknown()).optional(),
  heroDesktopImage: z.string().trim().optional(),
  heroMobileImage: z.string().trim().optional(),
  aboutDesktopImage: z.string().trim().optional(),
  aboutMobileImage: z.string().trim().optional(),
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
        try {
          const u = new URL(val);
          return (
            u.protocol === "https:" &&
            u.hostname.endsWith(".blob.vercel-storage.com") &&
            !u.pathname.includes("..")
          );
        } catch {
          return false;
        }
      },
      {
        message:
          "Only Vercel Blob URLs (*.blob.vercel-storage.com) can be deleted via this endpoint",
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
  stock?: number;
  variants?: unknown;
  mediaUrls?: string[];
  images?: string[];
  isBestseller?: boolean;
  badge?: string | null;
  category?: string;
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
    p.isBestseller || (p.badge as string) === "BESTSELLER"
  );
  const variants = Array.isArray(p.variants) ? p.variants : [];

  let category = p.category as string | undefined;
  if (!category && Array.isArray(p.variants)) {
    const metaVariant = p.variants.find(
      (v) => v && typeof v === "object" && "_metadata" in v
    ) as { _metadata?: { category?: string } } | undefined;
    if (metaVariant?._metadata?.category) {
      category = metaVariant._metadata.category;
    }
  }

  return {
    id: p.id,
    name,
    title: name,
    slug: p.slug,
    description: p.description || "",
    price: Number(p.price),
    stock: Number(p.stock || 0),
    variants,
    mediaUrls,
    images: mediaUrls,
    isBestseller,
    badge: isBestseller ? "BESTSELLER" : null,
    category: category || "apparel",
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
});

export type WhatsAppCartApiRequest = z.infer<typeof whatsAppCartApiRequestSchema>;
