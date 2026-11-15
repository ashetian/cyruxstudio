import { PrismaClient } from "@prisma/client";
import {
  SEED_PRODUCTS,
  INITIAL_STORE_SETTINGS,
  INITIAL_DROPS,
  type ProductVariant,
} from "./seed-data";

export type { ProductVariant };

export interface BrandMetadata {
  title: string;
  brandName?: string;
  heroDisplayTitle?: string;
  tagline?: string;
  description?: string;
  socialHandles?: Record<string, string>;
  socialLinks?: Record<string, string>;
  supportEmail?: string;
  whatsappFormatted?: string;
  location?: string;
  announcement?: string;
}

// Canonical Fixtures populated from seed-data
export const MOCK_PRODUCTS = SEED_PRODUCTS.map((p, idx) => ({
  id: p.id || `prod_${idx + 1}`,
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: p.price,
  stock: p.stock,
  variants: p.variants,
  mediaUrls: p.mediaUrls,
  isBestseller: p.isBestseller,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
}));

export const MOCK_STORE_SETTINGS = {
  ...INITIAL_STORE_SETTINGS,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

export const MOCK_DROPS = INITIAL_DROPS.map((d) => ({
  ...d,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
}));

// ============================================================================
// Environment & Health Check Helpers
// ============================================================================

export function isDbConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(
    url &&
      !url.includes("dummy") &&
      !url.includes("mock:mock") &&
      !url.includes("[YOUR-PASSWORD]") &&
      !url.includes("[password]")
  );
}

export async function checkDbConnection(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!isDbConfigured()) {
    return {
      ok: false,
      error: "DATABASE_URL not configured (running in mock mode)",
    };
  }
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Connection probe failed";
    return { ok: false, error };
  }
}

// ============================================================================
// In-Memory Mock Store & Model Handlers
// ============================================================================

interface MockElevenLabsAsset {
  id: string;
  promptHash: string;
  mediaUrl: string;
  mediaType: string;
  creditsUsed: number;
  status: string;
  metadata?: unknown;
  createdAt: Date;
}

interface MockCreditLog {
  id: string;
  action: string;
  creditsUsed: number;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: Date;
}

const mockStore = {
  products: [...MOCK_PRODUCTS],
  settings: { ...MOCK_STORE_SETTINGS },
  elevenLabsAssets: [] as MockElevenLabsAsset[],
  creditLogs: [] as MockCreditLog[],
  drops: [...MOCK_DROPS],
};

type MockHandlerFn = (...args: never[]) => Promise<unknown>;

const mockHandlers: Record<string, Record<string, MockHandlerFn>> = {
  product: {
    findMany: async (args?: {
      where?: {
        isBestseller?: boolean;
        slug?: string | { in?: string[] };
        id?: string | { in?: string[] };
        category?: string;
        stock?: number | { gt?: number; lte?: number; gte?: number; lt?: number };
        OR?: Array<{ id?: string; slug?: string }>;
      };
      take?: number;
      skip?: number;
      orderBy?: unknown;
    }) => {
      let list = [...mockStore.products];
      if (args?.where) {
        const { isBestseller, slug, id, stock, OR, category } = args.where;
        if (isBestseller !== undefined) {
          list = list.filter((p) => p.isBestseller === isBestseller);
        }
        if (typeof slug === "string") {
          list = list.filter((p) => p.slug === slug);
        } else if (slug && typeof slug === "object" && "in" in slug && Array.isArray(slug.in)) {
          list = list.filter((p) => slug.in!.includes(p.slug));
        }
        if (typeof id === "string") {
          list = list.filter((p) => p.id === id);
        } else if (id && typeof id === "object" && "in" in id && Array.isArray(id.in)) {
          list = list.filter((p) => id.in!.includes(p.id));
        }
        if (category) {
          list = list.filter((p) => {
            const prod = p as Record<string, unknown>;
            const cat = prod.category ? String(prod.category).toLowerCase() : "";
            return (
              cat === category.toLowerCase() ||
              p.name.toLowerCase().includes(category.toLowerCase())
            );
          });
        }
        if (typeof stock === "number") {
          list = list.filter((p) => p.stock === stock);
        } else if (stock && typeof stock === "object") {
          if (stock.gt !== undefined) list = list.filter((p) => p.stock > stock.gt!);
          if (stock.gte !== undefined) list = list.filter((p) => p.stock >= stock.gte!);
          if (stock.lt !== undefined) list = list.filter((p) => p.stock < stock.lt!);
          if (stock.lte !== undefined) list = list.filter((p) => p.stock <= stock.lte!);
        }
        if (OR && Array.isArray(OR)) {
          list = list.filter((p) =>
            OR.some(
              (condition) =>
                (condition.id && p.id === condition.id) ||
                (condition.slug && p.slug === condition.slug)
            )
          );
        }
      }
      if (args?.orderBy) {
        const orderConfig = Array.isArray(args.orderBy)
          ? (args.orderBy[0] as Record<string, "asc" | "desc">)
          : (args.orderBy as Record<string, "asc" | "desc">);
        if (orderConfig && typeof orderConfig === "object") {
          const [key, order] = Object.entries(orderConfig)[0] || [];
          if (key === "createdAt") {
            list.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return order === "desc" ? dateB - dateA : dateA - dateB;
            });
          } else if (key === "price") {
            list.sort((a, b) =>
              order === "desc" ? b.price - a.price : a.price - b.price
            );
          } else if (key === "name") {
            list.sort((a, b) =>
              order === "desc"
                ? b.name.localeCompare(a.name)
                : a.name.localeCompare(b.name)
            );
          }
        }
      }
      if (args?.skip) list = list.slice(args.skip);
      if (args?.take) list = list.slice(0, args.take);
      return list;
    },
    findUnique: async (args: {
      where: {
        slug?: string;
        id?: string;
        OR?: Array<{ id?: string; slug?: string }>;
      };
    }) => {
      if (args?.where?.slug) {
        return mockStore.products.find((p) => p.slug === args.where.slug) || null;
      }
      if (args?.where?.id) {
        return mockStore.products.find((p) => p.id === args.where.id) || null;
      }
      if (args?.where?.OR && Array.isArray(args.where.OR)) {
        return (
          mockStore.products.find((p) =>
            args.where.OR!.some(
              (c) => (c.id && p.id === c.id) || (c.slug && p.slug === c.slug)
            )
          ) || null
        );
      }
      return null;
    },
    findFirst: async (args?: {
      where?: {
        isBestseller?: boolean;
        slug?: string;
        id?: string;
        OR?: Array<{ id?: string; slug?: string }>;
      };
    }) => {
      if (args?.where) {
        let list = [...mockStore.products];
        if (args.where.isBestseller !== undefined) {
          list = list.filter((p) => p.isBestseller === args.where!.isBestseller);
        }
        if (args.where.slug) {
          list = list.filter((p) => p.slug === args.where!.slug);
        }
        if (args.where.id) {
          list = list.filter((p) => p.id === args.where!.id);
        }
        if (args.where.OR && Array.isArray(args.where.OR)) {
          list = list.filter((p) =>
            args.where!.OR!.some(
              (c) => (c.id && p.id === c.id) || (c.slug && p.slug === c.slug)
            )
          );
        }
        return list[0] || null;
      }
      return mockStore.products[0] || null;
    },
    count: async () => mockStore.products.length,
    create: async (args: { data: Record<string, unknown> }) => {
      const created = {
        ...(args.data as unknown as (typeof mockStore.products)[number]),
        id: (args.data.id as string) || `prod_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.products.push(created);
      return created;
    },
    update: async (args: {
      where: { id?: string; slug?: string };
      data: Record<string, unknown>;
    }) => {
      const idx = mockStore.products.findIndex(
        (p) =>
          (args.where.id && p.id === args.where.id) ||
          (args.where.slug && p.slug === args.where.slug)
      );
      if (idx === -1) throw new Error("Product not found");
      mockStore.products[idx] = {
        ...mockStore.products[idx],
        ...args.data,
        updatedAt: new Date(),
      };
      return mockStore.products[idx];
    },
    upsert: async (args: {
      where: { id?: string; slug?: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const idx = mockStore.products.findIndex(
        (p) =>
          (args.where.id && p.id === args.where.id) ||
          (args.where.slug && p.slug === args.where.slug)
      );
      if (idx === -1) {
        const created = {
          ...(args.create as unknown as (typeof mockStore.products)[number]),
          id: (args.create.id as string) || `prod_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockStore.products.push(created);
        return created;
      }
      mockStore.products[idx] = {
        ...mockStore.products[idx],
        ...args.update,
        updatedAt: new Date(),
      };
      return mockStore.products[idx];
    },
    delete: async (args: { where: { id?: string; slug?: string } }) => {
      const idx = mockStore.products.findIndex(
        (p) =>
          (args.where.id && p.id === args.where.id) ||
          (args.where.slug && p.slug === args.where.slug)
      );
      if (idx === -1) throw new Error("Product not found");
      const [deleted] = mockStore.products.splice(idx, 1);
      return deleted;
    },
  },
  storeSettings: {
    findFirst: async () => mockStore.settings,
    findUnique: async () => mockStore.settings,
    upsert: async (args: {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      mockStore.settings = {
        ...mockStore.settings,
        ...(args.create as unknown as typeof mockStore.settings),
        ...(args.update as unknown as typeof mockStore.settings),
        updatedAt: new Date(),
      };
      return mockStore.settings;
    },
    update: async (args: { data: Record<string, unknown> }) => {
      mockStore.settings = {
        ...mockStore.settings,
        ...(args.data as unknown as typeof mockStore.settings),
        updatedAt: new Date(),
      };
      return mockStore.settings;
    },
  },
  elevenLabsAsset: {
    findUnique: async (args: { where: { promptHash?: string; id?: string } }) => {
      if (args?.where?.promptHash) {
        return (
          mockStore.elevenLabsAssets.find(
            (a) => a.promptHash === args.where.promptHash
          ) || null
        );
      }
      if (args?.where?.id) {
        return (
          mockStore.elevenLabsAssets.find((a) => a.id === args.where.id) || null
        );
      }
      return null;
    },
    findFirst: async () => mockStore.elevenLabsAssets[0] || null,
    findMany: async () => [...mockStore.elevenLabsAssets],
    create: async (args: { data: Record<string, unknown> }) => {
      const created = {
        ...(args.data as unknown as MockElevenLabsAsset),
        id: (args.data.id as string) || `ela_${Date.now()}`,
        createdAt: new Date(),
      };
      mockStore.elevenLabsAssets.push(created);
      return created;
    },
  },
  creditUsageLog: {
    aggregate: async () => {
      const total = mockStore.creditLogs.reduce(
        (acc, log) => acc + (log.creditsUsed || 0),
        0
      );
      return { _sum: { creditsUsed: total } };
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const created = {
        ...(args.data as unknown as MockCreditLog),
        id: (args.data.id as string) || `cul_${Date.now()}`,
        timestamp: new Date(),
      };
      mockStore.creditLogs.push(created);
      return created;
    },
    findMany: async () => [...mockStore.creditLogs],
  },
  drop: {
    findMany: async (args?: {
      where?: { status?: string; slug?: string; id?: string };
      orderBy?: unknown;
    }) => {
      let list = [...mockStore.drops];
      if (args?.where) {
        if (args.where.status) {
          list = list.filter((d) => d.status === args.where!.status);
        }
        if (args.where.slug) {
          list = list.filter((d) => d.slug === args.where!.slug);
        }
        if (args.where.id) {
          list = list.filter((d) => d.id === args.where!.id);
        }
      }
      return list;
    },
    findUnique: async (args: { where: { slug?: string; id?: string } }) => {
      if (args?.where?.slug) {
        return mockStore.drops.find((d) => d.slug === args.where.slug) || null;
      }
      if (args?.where?.id) {
        return mockStore.drops.find((d) => d.id === args.where.id) || null;
      }
      return null;
    },
    findFirst: async (args?: {
      where?: {
        status?: string;
        slug?: string;
        id?: string;
        OR?: Array<{ id?: string; slug?: string; number?: string }>;
      };
    }) => {
      if (!args?.where) return mockStore.drops[0] || null;
      let list = [...mockStore.drops];
      if (args.where.status) {
        list = list.filter((d) => d.status === args.where!.status);
      }
      if (args.where.slug) {
        list = list.filter((d) => d.slug === args.where!.slug);
      }
      if (args.where.id) {
        list = list.filter((d) => d.id === args.where!.id);
      }
      if (args.where.OR && Array.isArray(args.where.OR)) {
        list = list.filter((d) =>
          args.where!.OR!.some(
            (c) =>
              (c.id && d.id === c.id) ||
              (c.slug && d.slug === c.slug) ||
              (c.number && d.number === c.number)
          )
        );
      }
      return list[0] || null;
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const created = {
        id: (args.data.id as string) || `drop-${Date.now()}`,
        slug: (args.data.slug as string) || `drop-${Date.now()}`,
        number: (args.data.number as string) || "01",
        chapter: (args.data.chapter as string) || "CHAPTER 01",
        title: (args.data.title as string) || "UNTITLED DROP",
        status: (args.data.status as string) || "upcoming",
        releaseDate: args.data.releaseDate || { tr: "YAKINDA", en: "COMING SOON" },
        edition: args.data.edition || { tr: "LİMİTLİ", en: "LIMITED" },
        description: args.data.description || { tr: "", en: "" },
        productSlugs: (args.data.productSlugs as string[]) || [],
        bannerImage: (args.data.bannerImage as string) || "/assets/editorial/hero-desktop.jpg",
        totalPieces: Number(args.data.totalPieces) || 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.drops.push(created as unknown as (typeof mockStore.drops)[number]);
      return created;
    },
    update: async (args: {
      where: { id?: string; slug?: string };
      data: Record<string, unknown>;
    }) => {
      const idx = mockStore.drops.findIndex(
        (d) =>
          (args.where.id && d.id === args.where.id) ||
          (args.where.slug && d.slug === args.where.slug)
      );
      if (idx === -1) throw new Error("Drop not found");
      mockStore.drops[idx] = {
        ...mockStore.drops[idx],
        ...args.data,
        updatedAt: new Date(),
      };
      return mockStore.drops[idx];
    },
    updateMany: async (args: {
      where?: { status?: string };
      data: Record<string, unknown>;
    }) => {
      let count = 0;
      mockStore.drops = mockStore.drops.map((d) => {
        if (!args.where?.status || d.status === args.where.status) {
          count++;
          return { ...d, ...args.data, updatedAt: new Date() };
        }
        return d;
      });
      return { count };
    },
    delete: async (args: { where: { id?: string; slug?: string } }) => {
      const idx = mockStore.drops.findIndex(
        (d) =>
          (args.where.id && d.id === args.where.id) ||
          (args.where.slug && d.slug === args.where.slug)
      );
      if (idx === -1) throw new Error("Drop not found");
      const [deleted] = mockStore.drops.splice(idx, 1);
      return deleted;
    },
    count: async () => mockStore.drops.length,
  },
};

// ============================================================================
// Client Factory & Resilient Proxy Interceptor
// ============================================================================

function createPrismaClient(): PrismaClient {
  const fallbackUrl =
    "postgresql://mock:mock@localhost:5432/mock_cyrux?connect_timeout=2";
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || fallbackUrl,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

function createResilientPrismaClient(client: PrismaClient): PrismaClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && prop in mockHandlers) {
        const modelTarget = Reflect.get(target, prop, receiver);
        const mockModel = mockHandlers[prop];
        return new Proxy(modelTarget, {
          get(mTarget, mProp) {
            const originalMethod = Reflect.get(mTarget, mProp);
            if (typeof originalMethod === "function") {
              return async (...args: unknown[]) => {
                // In unconfigured / mock mode, serve directly from in-memory fallback
                if (!isDbConfigured()) {
                  if (
                    mockModel &&
                    typeof mockModel[mProp as string] === "function"
                  ) {
                    return mockModel[mProp as string](...(args as never[]));
                  }
                  return null;
                }
                // When configured, try real query, fallback if network or connection drops
                try {
                  const result = await originalMethod.apply(mTarget, args);
                  if (prop === "storeSettings" && result && typeof result === "object") {
                    mockStore.settings = {
                      ...mockStore.settings,
                      ...(result as Record<string, unknown>),
                    };
                  }
                  return result;
                } catch (err: unknown) {
                  const errorMsg =
                    err instanceof Error ? err.message : "connection error";
                  console.warn(
                    `[DB Fallback Interceptor] ${String(prop)}.${String(
                      mProp
                    )} failed: ${errorMsg}. Serving mock data.`
                  );
                  if (
                    mockModel &&
                    typeof mockModel[mProp as string] === "function"
                  ) {
                    return mockModel[mProp as string](...(args as never[]));
                  }
                  throw err;
                }
              };
            }
            return originalMethod;
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

// ============================================================================
// Global Singleton Cache (Hot-Reload Safe)
// ============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createResilientPrismaClient(createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
