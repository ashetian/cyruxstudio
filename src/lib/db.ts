import { PrismaClient } from "@prisma/client";
import {
  SEED_PRODUCTS,
  INITIAL_STORE_SETTINGS,
  INITIAL_DROPS,
  INITIAL_COLLECTIONS,
  INITIAL_COUPONS,
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
  discountPrice: p.discountPrice ?? null,
  stock: p.stock,
  variants: p.variants,
  mediaUrls: p.mediaUrls,
  isBestseller: p.isBestseller,
  color: p.color ?? null,
  colorHex: p.colorHex ?? null,
  twinProductSlug: p.twinProductSlug ?? null,
  isDiptych: Boolean(p.isDiptych),
  category: p.category ?? "apparel",
  badge: p.badge ?? (p.isBestseller ? "BESTSELLER" : null),
  sku: p.sku ?? null,
  sortOrder: p.sortOrder ?? idx,
  isActive: p.isActive ?? true,
  collectionId: p.collectionId ?? null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
}));

export const MOCK_STORE_SETTINGS = {
  ...INITIAL_STORE_SETTINGS,
  freeShippingThreshold: INITIAL_STORE_SETTINGS.freeShippingThreshold ?? null,
  shippingFee: INITIAL_STORE_SETTINGS.shippingFee ?? 0,
  lowStockThreshold: INITIAL_STORE_SETTINGS.lowStockThreshold ?? 3,
  activeTheme: INITIAL_STORE_SETTINGS.activeTheme ?? "white-atelier",
  announcementEnabled: INITIAL_STORE_SETTINGS.announcementEnabled ?? true,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

export const MOCK_DROPS = INITIAL_DROPS.map((d) => ({
  ...d,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
}));

export const MOCK_COLLECTIONS = INITIAL_COLLECTIONS.map((c) => ({
  ...c,
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
// Unified Resilient Store (globalThis + data/store-fallback.json)
// ============================================================================

type NodeFsLike = {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string, enc: BufferEncoding) => string;
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => void;
  writeFileSync: (p: string, data: string, enc: BufferEncoding) => void;
  renameSync: (oldP: string, newP: string) => void;
};
type NodePathLike = {
  join: (...parts: string[]) => string;
  dirname: (p: string) => string;
};

function getServerFsAndPath(): {
  fs: NodeFsLike;
  path: NodePathLike;
  snapshotPath: string;
} | null {
  if (typeof window !== "undefined") return null;
  try {
    const req = eval("require") as (mod: string) => unknown;
    const fsMod = req("fs") as NodeFsLike;
    const pathMod = req("path") as NodePathLike;
    const snapshotPath = pathMod.join(process.cwd(), "data", "store-fallback.json");
    return { fs: fsMod, path: pathMod, snapshotPath };
  } catch {
    return null;
  }
}

export interface MockProductRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  variants: unknown;
  mediaUrls: string[];
  isBestseller: boolean;
  color: string | null;
  colorHex: string | null;
  twinProductSlug: string | null;
  isDiptych: boolean;
  category: string;
  badge: string | null;
  sku: string | null;
  sortOrder: number;
  isActive: boolean;
  collectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockStoreSettingsRecord {
  id: string;
  whatsappNumber: string;
  currency: string;
  brandMetadata: Record<string, unknown>;
  freeShippingThreshold: number | null;
  shippingFee: number;
  lowStockThreshold: number;
  activeTheme: string;
  announcementEnabled: boolean;
  updatedAt: Date;
}

export interface MockDropRecord {
  id: string;
  slug: string;
  number: string;
  chapter: string;
  title: string;
  status: string;
  releaseDate: unknown;
  edition: unknown;
  description: unknown;
  productSlugs: string[];
  bannerImage: string;
  totalPieces: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCollectionRecord {
  id: string;
  slug: string;
  name: unknown;
  description: unknown;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOrderRecord {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string | null;
  status: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  whatsappUrl: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOrderItemRecord {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface MockCouponRecord {
  id: string;
  code: string;
  title: unknown;
  discountType: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockStorefrontSectionRecord {
  key: string;
  data: unknown;
  isEnabled: boolean;
  updatedAt: Date;
}

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

interface MockStoreState {
  products: MockProductRecord[];
  settings: MockStoreSettingsRecord;
  elevenLabsAssets: MockElevenLabsAsset[];
  creditLogs: MockCreditLog[];
  drops: MockDropRecord[];
  collections: MockCollectionRecord[];
  customers: MockCustomerRecord[];
  orders: MockOrderRecord[];
  orderItems: MockOrderItemRecord[];
  coupons: MockCouponRecord[];
  storefrontSections: MockStorefrontSectionRecord[];
}

function reviveDates<T>(obj: T): T {
  const dateKeys = new Set([
    "createdAt",
    "updatedAt",
    "timestamp",
    "startsAt",
    "expiresAt",
  ]);
  if (Array.isArray(obj)) {
    return obj.map((item) => reviveDates(item)) as unknown as T;
  }
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (dateKeys.has(k) && typeof v === "string" && v.length > 0) {
        const parsed = new Date(v);
        out[k] = Number.isNaN(parsed.getTime()) ? v : parsed;
      } else if (v && typeof v === "object") {
        out[k] = reviveDates(v);
      } else {
        out[k] = v;
      }
    }
    return out as T;
  }
  return obj;
}

function createInitialMockStore(): MockStoreState {
  return {
    products: MOCK_PRODUCTS.map((p) => ({
      ...p,
      variants: structuredClone(p.variants),
      mediaUrls: [...p.mediaUrls],
    })),
    settings: structuredClone(MOCK_STORE_SETTINGS),
    elevenLabsAssets: [],
    creditLogs: [],
    drops: MOCK_DROPS.map((d) => structuredClone(d)),
    collections: MOCK_COLLECTIONS.map((c) => structuredClone(c)),
    customers: [],
    orders: [],
    orderItems: [],
    coupons: INITIAL_COUPONS.map((c) => ({
      ...c,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    })),
    storefrontSections: [],
  };
}

function loadFallbackStore(): MockStoreState {
  const defaults = createInitialMockStore();
  const srv = getServerFsAndPath();
  if (!srv) return defaults;
  try {
    if (!srv.fs.existsSync(srv.snapshotPath)) {
      return defaults;
    }
    const raw = srv.fs.readFileSync(srv.snapshotPath, "utf8");
    if (!raw.trim()) return defaults;
    const parsed = reviveDates(JSON.parse(raw)) as Partial<MockStoreState>;

    const products = Array.isArray(parsed.products)
      ? parsed.products.map((p, idx) => ({
          ...p,
          discountPrice: p.discountPrice ?? null,
          category: p.category ?? "apparel",
          badge: p.badge !== undefined ? p.badge : p.isBestseller ? "BESTSELLER" : null,
          sku: p.sku ?? null,
          sortOrder: typeof p.sortOrder === "number" ? p.sortOrder : idx,
          isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
          collectionId: p.collectionId ?? null,
          createdAt: p.createdAt instanceof Date ? p.createdAt : new Date("2026-01-01T00:00:00Z"),
          updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date("2026-01-01T00:00:00Z"),
        }))
      : defaults.products;

    const settings: MockStoreSettingsRecord = parsed.settings
      ? {
          ...defaults.settings,
          ...parsed.settings,
          freeShippingThreshold:
            parsed.settings.freeShippingThreshold !== undefined
              ? parsed.settings.freeShippingThreshold
              : defaults.settings.freeShippingThreshold,
          shippingFee:
            typeof parsed.settings.shippingFee === "number"
              ? parsed.settings.shippingFee
              : defaults.settings.shippingFee,
          lowStockThreshold:
            typeof parsed.settings.lowStockThreshold === "number"
              ? parsed.settings.lowStockThreshold
              : defaults.settings.lowStockThreshold,
          activeTheme: parsed.settings.activeTheme || defaults.settings.activeTheme,
          announcementEnabled:
            parsed.settings.announcementEnabled !== undefined
              ? Boolean(parsed.settings.announcementEnabled)
              : defaults.settings.announcementEnabled,
          updatedAt:
            parsed.settings.updatedAt instanceof Date
              ? parsed.settings.updatedAt
              : new Date(),
        }
      : defaults.settings;

    return {
      products,
      settings,
      elevenLabsAssets: Array.isArray(parsed.elevenLabsAssets)
        ? parsed.elevenLabsAssets
        : defaults.elevenLabsAssets,
      creditLogs: Array.isArray(parsed.creditLogs)
        ? parsed.creditLogs
        : defaults.creditLogs,
      drops:
        Array.isArray(parsed.drops) && parsed.drops.length > 0
          ? parsed.drops
          : defaults.drops,
      collections: Array.isArray(parsed.collections)
        ? parsed.collections
        : defaults.collections,
      customers: Array.isArray(parsed.customers)
        ? parsed.customers
        : defaults.customers,
      orders: Array.isArray(parsed.orders) ? parsed.orders : defaults.orders,
      orderItems: Array.isArray(parsed.orderItems)
        ? parsed.orderItems
        : defaults.orderItems,
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : defaults.coupons,
      storefrontSections: Array.isArray(parsed.storefrontSections)
        ? parsed.storefrontSections
        : defaults.storefrontSections,
    };
  } catch (err) {
    console.warn("[DB Fallback] Failed to load store-fallback.json, using seed defaults:", err);
    return defaults;
  }
}

const globalForMockStore = globalThis as unknown as {
  __cyruxMockStore?: MockStoreState;
};

const mockStore: MockStoreState =
  globalForMockStore.__cyruxMockStore ?? loadFallbackStore();
globalForMockStore.__cyruxMockStore = mockStore;

function persistFallbackSnapshot(): void {
  const srv = getServerFsAndPath();
  if (!srv) return;
  try {
    const dir = srv.path.dirname(srv.snapshotPath);
    if (!srv.fs.existsSync(dir)) {
      srv.fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${srv.snapshotPath}.tmp`;
    srv.fs.writeFileSync(tmpPath, JSON.stringify(mockStore, null, 2), "utf8");
    srv.fs.renameSync(tmpPath, srv.snapshotPath);
  } catch (err) {
    console.warn("[DB Fallback] Failed to write store-fallback.json:", err);
  }
}

export function getFallbackDropsSync(): MockDropRecord[] {
  return [...mockStore.drops];
}

export function syncFallbackDrops(
  records: unknown[],
  persist: boolean = false
): void {
  if (!Array.isArray(records)) return;
  mockStore.drops = records.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id || ""),
      slug: String(r.slug || ""),
      number: String(r.number || "01"),
      chapter: String(r.chapter || "CHAPTER 00"),
      title: String(r.title || ""),
      status: String(r.status || "upcoming"),
      releaseDate: r.releaseDate || { tr: "YAKINDA", en: "COMING SOON" },
      edition: r.edition || { tr: "LİMİTLİ", en: "LIMITED" },
      description: r.description || { tr: "", en: "" },
      productSlugs: Array.isArray(r.productSlugs)
        ? r.productSlugs.map(String)
        : [],
      bannerImage: String(r.bannerImage || "/assets/editorial/hero-desktop.jpg"),
      totalPieces: Number(r.totalPieces) || 0,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt
          : r.createdAt
          ? new Date(String(r.createdAt))
          : new Date(),
      updatedAt:
        r.updatedAt instanceof Date
          ? r.updatedAt
          : r.updatedAt
          ? new Date(String(r.updatedAt))
          : new Date(),
    };
  });
  if (persist) {
    persistFallbackSnapshot();
  }
}

function applyPrismaUpdateData<T extends Record<string, unknown>>(
  existing: T,
  data: Record<string, unknown>
): T {
  const next: Record<string, unknown> = { ...existing };
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      const opObj = val as Record<string, unknown>;
      if ("increment" in opObj && typeof opObj.increment === "number") {
        const current = typeof next[key] === "number" ? (next[key] as number) : 0;
        next[key] = current + opObj.increment;
        continue;
      }
      if ("decrement" in opObj && typeof opObj.decrement === "number") {
        const current = typeof next[key] === "number" ? (next[key] as number) : 0;
        next[key] = current - opObj.decrement;
        continue;
      }
      if ("set" in opObj) {
        next[key] = opObj.set;
        continue;
      }
    }
    next[key] = val;
  }
  return next as T;
}

function matchesStringFilter(
  fieldValue: string | null | undefined,
  filter: unknown
): boolean {
  if (filter === undefined) return true;
  if (typeof filter === "string") {
    return (fieldValue ?? "") === filter;
  }
  if (filter && typeof filter === "object") {
    const f = filter as { contains?: string; mode?: string; in?: string[]; equals?: string };
    if (f.equals !== undefined) {
      return (fieldValue ?? "") === f.equals;
    }
    if (Array.isArray(f.in)) {
      return fieldValue != null && f.in.includes(fieldValue);
    }
    if (typeof f.contains === "string") {
      const target = fieldValue ?? "";
      if (f.mode === "insensitive") {
        return target.toLowerCase().includes(f.contains.toLowerCase());
      }
      return target.includes(f.contains);
    }
  }
  return true;
}

function sortByOrderConfig<T extends Record<string, unknown>>(
  list: T[],
  orderBy: unknown
): T[] {
  if (!orderBy) return list;
  const configs = Array.isArray(orderBy)
    ? (orderBy as Array<Record<string, "asc" | "desc">>)
    : [orderBy as Record<string, "asc" | "desc">];
  return [...list].sort((a, b) => {
    for (const cfg of configs) {
      if (!cfg || typeof cfg !== "object") continue;
      for (const [key, dir] of Object.entries(cfg)) {
        const av = a[key];
        const bv = b[key];
        let cmp = 0;
        if (av instanceof Date || bv instanceof Date) {
          const ta = av ? new Date(av as Date | string).getTime() : 0;
          const tb = bv ? new Date(bv as Date | string).getTime() : 0;
          cmp = ta - tb;
        } else if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv;
        } else if (typeof av === "string" && typeof bv === "string") {
          cmp = av.localeCompare(bv);
        }
        if (cmp !== 0) {
          return dir === "desc" ? -cmp : cmp;
        }
      }
    }
    return 0;
  });
}

function applySelectProjection<T extends Record<string, unknown>>(
  item: T,
  select?: Record<string, boolean>
): Record<string, unknown> {
  if (!select) return item;
  const out: Record<string, unknown> = {};
  for (const [k, enabled] of Object.entries(select)) {
    if (enabled) out[k] = item[k];
  }
  return out;
}

type MockHandlerFn = (...args: never[]) => Promise<unknown>;

function filterMockProducts(where?: Record<string, unknown>): MockProductRecord[] {
  let list = [...mockStore.products];
  if (!where) return list;

  const { isBestseller, isActive, collectionId, slug, id, stock, OR, category } =
    where as {
      isBestseller?: boolean;
      isActive?: boolean;
      collectionId?: string | null;
      slug?: string | { in?: string[] };
      id?: string | { in?: string[] };
      category?: string;
      stock?: number | { gt?: number; lte?: number; gte?: number; lt?: number };
      OR?: Array<Record<string, unknown>>;
    };

  if (isBestseller !== undefined) {
    list = list.filter((p) => p.isBestseller === isBestseller);
  }
  if (isActive !== undefined) {
    list = list.filter((p) => p.isActive === isActive);
  }
  if (collectionId !== undefined) {
    list = list.filter((p) => p.collectionId === collectionId);
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
      const cat = p.category ? String(p.category).toLowerCase() : "";
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
      OR.some((condition) => {
        if ("id" in condition && !matchesStringFilter(p.id, condition.id)) return false;
        if ("slug" in condition && !matchesStringFilter(p.slug, condition.slug)) return false;
        if ("name" in condition && !matchesStringFilter(p.name, condition.name)) return false;
        if ("description" in condition && !matchesStringFilter(p.description, condition.description)) return false;
        if ("category" in condition && !matchesStringFilter(p.category, condition.category)) return false;
        return Object.keys(condition).length > 0;
      })
    );
  }
  return list;
}

const mockHandlers: Record<string, Record<string, MockHandlerFn>> = {
  product: {
    findMany: async (args?: {
      where?: Record<string, unknown>;
      take?: number;
      skip?: number;
      orderBy?: unknown;
      include?: { collection?: boolean };
      select?: Record<string, boolean>;
    }) => {
      let list = filterMockProducts(args?.where);
      if (args?.orderBy) {
        list = sortByOrderConfig(
          list as unknown as Array<Record<string, unknown>>,
          args.orderBy
        ) as unknown as MockProductRecord[];
      }
      if (args?.skip) list = list.slice(args.skip);
      if (args?.take) list = list.slice(0, args.take);

      const enriched = list.map((p) => {
        if (args?.include?.collection) {
          const collection = p.collectionId
            ? mockStore.collections.find((c) => c.id === p.collectionId) || null
            : null;
          return { ...p, collection };
        }
        return p;
      });

      if (args?.select) {
        return enriched.map((item) =>
          applySelectProjection(item as unknown as Record<string, unknown>, args.select)
        );
      }
      return enriched;
    },
    findUnique: async (args: {
      where: {
        slug?: string;
        id?: string;
        OR?: Array<{ id?: string; slug?: string }>;
      };
      include?: { collection?: boolean };
    }) => {
      let found: MockProductRecord | null = null;
      if (args?.where?.slug) {
        found = mockStore.products.find((p) => p.slug === args.where.slug) || null;
      } else if (args?.where?.id) {
        found = mockStore.products.find((p) => p.id === args.where.id) || null;
      } else if (args?.where?.OR && Array.isArray(args.where.OR)) {
        found =
          mockStore.products.find((p) =>
            args.where.OR!.some(
              (c) => (c.id && p.id === c.id) || (c.slug && p.slug === c.slug)
            )
          ) || null;
      }
      if (!found) return null;
      if (args?.include?.collection) {
        const collection = found.collectionId
          ? mockStore.collections.find((c) => c.id === found!.collectionId) || null
          : null;
        return { ...found, collection };
      }
      return found;
    },
    findFirst: async (args?: {
      where?: Record<string, unknown>;
      include?: { collection?: boolean };
    }) => {
      const list = filterMockProducts(args?.where);
      const found = list[0] || null;
      if (!found) return null;
      if (args?.include?.collection) {
        const collection = found.collectionId
          ? mockStore.collections.find((c) => c.id === found.collectionId) || null
          : null;
        return { ...found, collection };
      }
      return found;
    },
    count: async (args?: { where?: Record<string, unknown> }) =>
      filterMockProducts(args?.where).length,
    create: async (args: { data: Record<string, unknown> }) => {
      const created: MockProductRecord = {
        id: (args.data.id as string) || `prod_${Date.now()}`,
        name: String(args.data.name || ""),
        slug: String(args.data.slug || ""),
        description: String(args.data.description || ""),
        price: Number(args.data.price || 0),
        discountPrice:
          args.data.discountPrice !== undefined && args.data.discountPrice !== null
            ? Number(args.data.discountPrice)
            : null,
        stock: Number(args.data.stock || 0),
        variants: args.data.variants ?? [],
        mediaUrls: Array.isArray(args.data.mediaUrls)
          ? (args.data.mediaUrls as string[])
          : [],
        isBestseller: Boolean(args.data.isBestseller),
        color: (args.data.color as string) ?? null,
        colorHex: (args.data.colorHex as string) ?? null,
        twinProductSlug: (args.data.twinProductSlug as string) ?? null,
        isDiptych: Boolean(args.data.isDiptych),
        category: (args.data.category as string) || "apparel",
        badge:
          args.data.badge !== undefined
            ? (args.data.badge as string | null)
            : args.data.isBestseller
            ? "BESTSELLER"
            : null,
        sku: (args.data.sku as string) ?? null,
        sortOrder: typeof args.data.sortOrder === "number" ? args.data.sortOrder : 0,
        isActive: args.data.isActive !== undefined ? Boolean(args.data.isActive) : true,
        collectionId: (args.data.collectionId as string) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.products.push(created);
      persistFallbackSnapshot();
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
        ...applyPrismaUpdateData(
          mockStore.products[idx] as unknown as Record<string, unknown>,
          args.data
        ),
        updatedAt: new Date(),
      } as unknown as MockProductRecord;
      persistFallbackSnapshot();
      return mockStore.products[idx];
    },
    updateMany: async (args: {
      where?: { id?: string | { in?: string[] }; collectionId?: string | null };
      data: Record<string, unknown>;
    }) => {
      let count = 0;
      mockStore.products = mockStore.products.map((p) => {
        const w = args.where;
        let matches = true;
        if (w?.collectionId !== undefined && p.collectionId !== w.collectionId) {
          matches = false;
        }
        if (typeof w?.id === "string" && p.id !== w.id) {
          matches = false;
        } else if (w?.id && typeof w.id === "object" && Array.isArray(w.id.in)) {
          if (!w.id.in.includes(p.id)) matches = false;
        }
        if (matches) {
          count++;
          return {
            ...applyPrismaUpdateData(
              p as unknown as Record<string, unknown>,
              args.data
            ),
            updatedAt: new Date(),
          } as unknown as MockProductRecord;
        }
        return p;
      });
      if (count > 0) persistFallbackSnapshot();
      return { count };
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
        return mockHandlers.product.create({ data: args.create } as never);
      }
      mockStore.products[idx] = {
        ...applyPrismaUpdateData(
          mockStore.products[idx] as unknown as Record<string, unknown>,
          args.update
        ),
        updatedAt: new Date(),
      } as unknown as MockProductRecord;
      persistFallbackSnapshot();
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
      persistFallbackSnapshot();
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
        ...(args.create as unknown as MockStoreSettingsRecord),
        ...(args.update as unknown as MockStoreSettingsRecord),
        updatedAt: new Date(),
      };
      persistFallbackSnapshot();
      return mockStore.settings;
    },
    update: async (args: { data: Record<string, unknown> }) => {
      mockStore.settings = {
        ...applyPrismaUpdateData(
          mockStore.settings as unknown as Record<string, unknown>,
          args.data
        ),
        updatedAt: new Date(),
      } as unknown as MockStoreSettingsRecord;
      persistFallbackSnapshot();
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
      persistFallbackSnapshot();
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
      persistFallbackSnapshot();
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
      if (args?.orderBy) {
        list = sortByOrderConfig(
          list as unknown as Array<Record<string, unknown>>,
          args.orderBy
        ) as unknown as MockDropRecord[];
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
      const created: MockDropRecord = {
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
        bannerImage:
          (args.data.bannerImage as string) || "/assets/editorial/hero-desktop.jpg",
        totalPieces: Number(args.data.totalPieces) || 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.drops.push(created);
      persistFallbackSnapshot();
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
        ...applyPrismaUpdateData(
          mockStore.drops[idx] as unknown as Record<string, unknown>,
          args.data
        ),
        updatedAt: new Date(),
      } as unknown as MockDropRecord;
      persistFallbackSnapshot();
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
      if (count > 0) persistFallbackSnapshot();
      return { count };
    },
    upsert: async (args: {
      where: { id?: string; slug?: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const idx = mockStore.drops.findIndex(
        (d) =>
          (args.where.id && d.id === args.where.id) ||
          (args.where.slug && d.slug === args.where.slug)
      );
      if (idx === -1) {
        return mockHandlers.drop.create({ data: args.create } as never);
      }
      mockStore.drops[idx] = {
        ...applyPrismaUpdateData(
          mockStore.drops[idx] as unknown as Record<string, unknown>,
          args.update
        ),
        updatedAt: new Date(),
      } as unknown as MockDropRecord;
      persistFallbackSnapshot();
      return mockStore.drops[idx];
    },
    delete: async (args: { where: { id?: string; slug?: string } }) => {
      const idx = mockStore.drops.findIndex(
        (d) =>
          (args.where.id && d.id === args.where.id) ||
          (args.where.slug && d.slug === args.where.slug)
      );
      if (idx === -1) throw new Error("Drop not found");
      const [deleted] = mockStore.drops.splice(idx, 1);
      persistFallbackSnapshot();
      return deleted;
    },
    count: async () => mockStore.drops.length,
  },
  collection: {
    findMany: async (args?: {
      where?: { isFeatured?: boolean; isActive?: boolean; slug?: string; id?: string };
      orderBy?: unknown;
      include?: { products?: boolean; _count?: { select?: { products?: boolean } } };
    }) => {
      let list = [...mockStore.collections];
      if (args?.where) {
        if (args.where.isFeatured !== undefined) {
          list = list.filter((c) => c.isFeatured === args.where!.isFeatured);
        }
        if (args.where.isActive !== undefined) {
          list = list.filter((c) => c.isActive === args.where!.isActive);
        }
        if (args.where.slug) {
          list = list.filter((c) => c.slug === args.where!.slug);
        }
        if (args.where.id) {
          list = list.filter((c) => c.id === args.where!.id);
        }
      }
      if (args?.orderBy) {
        list = sortByOrderConfig(
          list as unknown as Array<Record<string, unknown>>,
          args.orderBy
        ) as unknown as MockCollectionRecord[];
      }
      return list.map((c) => {
        const linkedProducts = mockStore.products.filter(
          (p) => p.collectionId === c.id
        );
        return {
          ...c,
          ...(args?.include?.products ? { products: linkedProducts } : {}),
          ...(args?.include?._count?.select?.products
            ? { _count: { products: linkedProducts.length } }
            : {}),
        };
      });
    },
    findUnique: async (args: {
      where: { id?: string; slug?: string };
      include?: { products?: boolean; _count?: { select?: { products?: boolean } } };
    }) => {
      const found =
        mockStore.collections.find(
          (c) =>
            (args.where.id && c.id === args.where.id) ||
            (args.where.slug && c.slug === args.where.slug)
        ) || null;
      if (!found) return null;
      const linkedProducts = mockStore.products.filter(
        (p) => p.collectionId === found.id
      );
      return {
        ...found,
        ...(args?.include?.products ? { products: linkedProducts } : {}),
        ...(args?.include?._count?.select?.products
          ? { _count: { products: linkedProducts.length } }
          : {}),
      };
    },
    findFirst: async (args?: {
      where?: {
        id?: string;
        slug?: string;
        OR?: Array<{ id?: string; slug?: string }>;
      };
      include?: { products?: boolean; _count?: { select?: { products?: boolean } } };
    }) => {
      let list = [...mockStore.collections];
      if (args?.where) {
        if (args.where.id) list = list.filter((c) => c.id === args.where!.id);
        if (args.where.slug) list = list.filter((c) => c.slug === args.where!.slug);
        if (args.where.OR) {
          list = list.filter((c) =>
            args.where!.OR!.some(
              (cond) => (cond.id && c.id === cond.id) || (cond.slug && c.slug === cond.slug)
            )
          );
        }
      }
      const found = list[0] || null;
      if (!found) return null;
      const linkedProducts = mockStore.products.filter(
        (p) => p.collectionId === found.id
      );
      return {
        ...found,
        ...(args?.include?.products ? { products: linkedProducts } : {}),
        ...(args?.include?._count?.select?.products
          ? { _count: { products: linkedProducts.length } }
          : {}),
      };
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const created: MockCollectionRecord = {
        id: (args.data.id as string) || `col_${Date.now()}`,
        slug: String(args.data.slug || `col-${Date.now()}`),
        name: args.data.name ?? { tr: "", en: "" },
        description: args.data.description ?? { tr: "", en: "" },
        imageUrl: (args.data.imageUrl as string | null) ?? null,
        isFeatured: Boolean(args.data.isFeatured),
        isActive: args.data.isActive !== undefined ? Boolean(args.data.isActive) : true,
        sortOrder: typeof args.data.sortOrder === "number" ? args.data.sortOrder : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.collections.push(created);
      persistFallbackSnapshot();
      return created;
    },
    update: async (args: {
      where: { id?: string; slug?: string };
      data: Record<string, unknown>;
    }) => {
      const idx = mockStore.collections.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.slug && c.slug === args.where.slug)
      );
      if (idx === -1) throw new Error("Collection not found");
      mockStore.collections[idx] = {
        ...applyPrismaUpdateData(
          mockStore.collections[idx] as unknown as Record<string, unknown>,
          args.data
        ),
        updatedAt: new Date(),
      } as unknown as MockCollectionRecord;
      persistFallbackSnapshot();
      return mockStore.collections[idx];
    },
    upsert: async (args: {
      where: { id?: string; slug?: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const idx = mockStore.collections.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.slug && c.slug === args.where.slug)
      );
      if (idx === -1) {
        return mockHandlers.collection.create({ data: args.create } as never);
      }
      mockStore.collections[idx] = {
        ...applyPrismaUpdateData(
          mockStore.collections[idx] as unknown as Record<string, unknown>,
          args.update
        ),
        updatedAt: new Date(),
      } as unknown as MockCollectionRecord;
      persistFallbackSnapshot();
      return mockStore.collections[idx];
    },
    delete: async (args: { where: { id?: string; slug?: string } }) => {
      const idx = mockStore.collections.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.slug && c.slug === args.where.slug)
      );
      if (idx === -1) throw new Error("Collection not found");
      const [deleted] = mockStore.collections.splice(idx, 1);
      mockStore.products = mockStore.products.map((p) =>
        p.collectionId === deleted.id ? { ...p, collectionId: null } : p
      );
      persistFallbackSnapshot();
      return deleted;
    },
    count: async () => mockStore.collections.length,
  },
  customer: {
    findMany: async (args?: {
      where?: { phone?: string; email?: string };
      orderBy?: unknown;
      include?: { orders?: boolean; _count?: { select?: { orders?: boolean } } };
    }) => {
      let list = [...mockStore.customers];
      if (args?.where?.phone) {
        list = list.filter((c) => c.phone === args.where!.phone);
      }
      if (args?.where?.email) {
        list = list.filter((c) => c.email === args.where!.email);
      }
      if (args?.orderBy) {
        list = sortByOrderConfig(
          list as unknown as Array<Record<string, unknown>>,
          args.orderBy
        ) as unknown as MockCustomerRecord[];
      }
      return list.map((c) => {
        const custOrders = mockStore.orders.filter((o) => o.customerId === c.id);
        return {
          ...c,
          ...(args?.include?.orders ? { orders: custOrders } : {}),
          ...(args?.include?._count?.select?.orders
            ? { _count: { orders: custOrders.length } }
            : {}),
        };
      });
    },
    findUnique: async (args: {
      where: { id?: string; phone?: string };
      include?: { orders?: boolean };
    }) => {
      const found =
        mockStore.customers.find(
          (c) =>
            (args.where.id && c.id === args.where.id) ||
            (args.where.phone && c.phone === args.where.phone)
        ) || null;
      if (!found) return null;
      if (args?.include?.orders) {
        const orders = mockStore.orders
          .filter((o) => o.customerId === found.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((o) => ({
            ...o,
            items: mockStore.orderItems.filter((oi) => oi.orderId === o.id),
          }));
        return { ...found, orders };
      }
      return found;
    },
    findFirst: async (args?: {
      where?: { id?: string; phone?: string; email?: string };
    }) => {
      if (!args?.where) return mockStore.customers[0] || null;
      return (
        mockStore.customers.find(
          (c) =>
            (!args.where!.id || c.id === args.where!.id) &&
            (!args.where!.phone || c.phone === args.where!.phone) &&
            (!args.where!.email || c.email === args.where!.email)
        ) || null
      );
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const created: MockCustomerRecord = {
        id: (args.data.id as string) || `cust_${Date.now()}`,
        name: String(args.data.name || ""),
        phone: String(args.data.phone || ""),
        email: (args.data.email as string | null) ?? null,
        city: (args.data.city as string | null) ?? null,
        address: (args.data.address as string | null) ?? null,
        notes: (args.data.notes as string | null) ?? null,
        totalOrders: Number(args.data.totalOrders ?? 0),
        totalSpent: Number(args.data.totalSpent ?? 0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.customers.push(created);
      persistFallbackSnapshot();
      return created;
    },
    update: async (args: {
      where: { id?: string; phone?: string };
      data: Record<string, unknown>;
    }) => {
      const idx = mockStore.customers.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.phone && c.phone === args.where.phone)
      );
      if (idx === -1) throw new Error("Customer not found");
      mockStore.customers[idx] = {
        ...applyPrismaUpdateData(
          mockStore.customers[idx] as unknown as Record<string, unknown>,
          args.data
        ),
        updatedAt: new Date(),
      } as unknown as MockCustomerRecord;
      persistFallbackSnapshot();
      return mockStore.customers[idx];
    },
    upsert: async (args: {
      where: { id?: string; phone?: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const idx = mockStore.customers.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.phone && c.phone === args.where.phone)
      );
      if (idx === -1) {
        return mockHandlers.customer.create({ data: args.create } as never);
      }
      mockStore.customers[idx] = {
        ...applyPrismaUpdateData(
          mockStore.customers[idx] as unknown as Record<string, unknown>,
          args.update
        ),
        updatedAt: new Date(),
      } as unknown as MockCustomerRecord;
      persistFallbackSnapshot();
      return mockStore.customers[idx];
    },
    delete: async (args: { where: { id?: string; phone?: string } }) => {
      const idx = mockStore.customers.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.phone && c.phone === args.where.phone)
      );
      if (idx === -1) throw new Error("Customer not found");
      const [deleted] = mockStore.customers.splice(idx, 1);
      mockStore.orders = mockStore.orders.map((o) =>
        o.customerId === deleted.id ? { ...o, customerId: null } : o
      );
      persistFallbackSnapshot();
      return deleted;
    },
    count: async () => mockStore.customers.length,
  },
  order: {
    findMany: async (args?: {
      where?: {
        status?: string;
        customerId?: string;
        orderNumber?: string;
        OR?: Array<Record<string, unknown>>;
      };
      orderBy?: unknown;
      include?: { items?: boolean; customer?: boolean };
      take?: number;
      skip?: number;
    }) => {
      let list = [...mockStore.orders];
      if (args?.where) {
        const { status, customerId, orderNumber, OR } = args.where;
        if (status) list = list.filter((o) => o.status === status);
        if (customerId) list = list.filter((o) => o.customerId === customerId);
        if (orderNumber) list = list.filter((o) => o.orderNumber === orderNumber);
        if (OR && Array.isArray(OR)) {
          list = list.filter((o) =>
            OR.some((c) => {
              if ("id" in c && !matchesStringFilter(o.id, c.id)) return false;
              if ("orderNumber" in c && !matchesStringFilter(o.orderNumber, c.orderNumber)) return false;
              if ("customerName" in c && !matchesStringFilter(o.customerName, c.customerName)) return false;
              if ("customerPhone" in c && !matchesStringFilter(o.customerPhone, c.customerPhone)) return false;
              return Object.keys(c).length > 0;
            })
          );
        }
      }
      if (args?.orderBy) {
        list = sortByOrderConfig(
          list as unknown as Array<Record<string, unknown>>,
          args.orderBy
        ) as unknown as MockOrderRecord[];
      }
      if (args?.skip) list = list.slice(args.skip);
      if (args?.take) list = list.slice(0, args.take);

      return list.map((o) => ({
        ...o,
        ...(args?.include?.items
          ? { items: mockStore.orderItems.filter((oi) => oi.orderId === o.id) }
          : {}),
        ...(args?.include?.customer
          ? {
              customer: o.customerId
                ? mockStore.customers.find((c) => c.id === o.customerId) || null
                : null,
            }
          : {}),
      }));
    },
    findUnique: async (args: {
      where: { id?: string; orderNumber?: string };
      include?: { items?: boolean; customer?: boolean };
    }) => {
      const found =
        mockStore.orders.find(
          (o) =>
            (args.where.id && o.id === args.where.id) ||
            (args.where.orderNumber && o.orderNumber === args.where.orderNumber)
        ) || null;
      if (!found) return null;
      return {
        ...found,
        ...(args?.include?.items
          ? { items: mockStore.orderItems.filter((oi) => oi.orderId === found.id) }
          : {}),
        ...(args?.include?.customer
          ? {
              customer: found.customerId
                ? mockStore.customers.find((c) => c.id === found.customerId) || null
                : null,
            }
          : {}),
      };
    },
    findFirst: async (args?: {
      where?: {
        id?: string;
        orderNumber?: string;
        OR?: Array<{ id?: string; orderNumber?: string }>;
      };
      include?: { items?: boolean; customer?: boolean };
    }) => {
      let list = [...mockStore.orders];
      if (args?.where) {
        if (args.where.id) list = list.filter((o) => o.id === args.where!.id);
        if (args.where.orderNumber) {
          list = list.filter((o) => o.orderNumber === args.where!.orderNumber);
        }
        if (args.where.OR) {
          list = list.filter((o) =>
            args.where!.OR!.some(
              (c) =>
                (c.id && o.id === c.id) ||
                (c.orderNumber && o.orderNumber === c.orderNumber)
            )
          );
        }
      }
      const found = list[0] || null;
      if (!found) return null;
      return {
        ...found,
        ...(args?.include?.items
          ? { items: mockStore.orderItems.filter((oi) => oi.orderId === found.id) }
          : {}),
        ...(args?.include?.customer
          ? {
              customer: found.customerId
                ? mockStore.customers.find((c) => c.id === found.customerId) || null
                : null,
            }
          : {}),
      };
    },
    create: async (args: {
      data: Record<string, unknown>;
      include?: { items?: boolean; customer?: boolean };
    }) => {
      const orderId = (args.data.id as string) || `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const created: MockOrderRecord = {
        id: orderId,
        orderNumber: String(args.data.orderNumber || `CYX-${Date.now()}`),
        customerId: (args.data.customerId as string | null) ?? null,
        customerName: String(args.data.customerName || "WhatsApp Guest"),
        customerPhone: String(args.data.customerPhone || ""),
        customerEmail: (args.data.customerEmail as string | null) ?? null,
        shippingAddress: (args.data.shippingAddress as string | null) ?? null,
        status: String(args.data.status || "pending"),
        trackingNumber: (args.data.trackingNumber as string | null) ?? null,
        trackingCarrier: (args.data.trackingCarrier as string | null) ?? null,
        currency: String(args.data.currency || "EUR"),
        subtotal: Number(args.data.subtotal || 0),
        discountAmount: Number(args.data.discountAmount || 0),
        shippingFee: Number(args.data.shippingFee || 0),
        total: Number(args.data.total || 0),
        couponCode: (args.data.couponCode as string | null) ?? null,
        whatsappUrl: (args.data.whatsappUrl as string | null) ?? null,
        customerNotes: (args.data.customerNotes as string | null) ?? null,
        adminNotes: (args.data.adminNotes as string | null) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.orders.push(created);

      const nestedItems = args.data.items as
        | { create?: Array<Record<string, unknown>> }
        | undefined;
      const createdItems: MockOrderItemRecord[] = [];
      if (nestedItems && Array.isArray(nestedItems.create)) {
        for (let i = 0; i < nestedItems.create.length; i++) {
          const itemInput = nestedItems.create[i];
          const itemRecord: MockOrderItemRecord = {
            id: (itemInput.id as string) || `oi_${Date.now()}_${i}`,
            orderId,
            productId: (itemInput.productId as string | null) ?? null,
            productName: String(itemInput.productName || ""),
            variantName: (itemInput.variantName as string | null) ?? null,
            quantity: Number(itemInput.quantity || 1),
            unitPrice: Number(itemInput.unitPrice || 0),
            lineTotal: Number(itemInput.lineTotal || 0),
          };
          mockStore.orderItems.push(itemRecord);
          createdItems.push(itemRecord);
        }
      }

      persistFallbackSnapshot();
      return {
        ...created,
        ...(args?.include?.items ? { items: createdItems } : {}),
        ...(args?.include?.customer
          ? {
              customer: created.customerId
                ? mockStore.customers.find((c) => c.id === created.customerId) || null
                : null,
            }
          : {}),
      };
    },
    update: async (args: {
      where: { id?: string; orderNumber?: string };
      data: Record<string, unknown>;
      include?: { items?: boolean; customer?: boolean };
    }) => {
      const idx = mockStore.orders.findIndex(
        (o) =>
          (args.where.id && o.id === args.where.id) ||
          (args.where.orderNumber && o.orderNumber === args.where.orderNumber)
      );
      if (idx === -1) throw new Error("Order not found");
      const { items: _nestedItems, ...restData } = args.data;
      void _nestedItems;
      mockStore.orders[idx] = {
        ...applyPrismaUpdateData(
          mockStore.orders[idx] as unknown as Record<string, unknown>,
          restData
        ),
        updatedAt: new Date(),
      } as unknown as MockOrderRecord;
      persistFallbackSnapshot();
      const updated = mockStore.orders[idx];
      return {
        ...updated,
        ...(args?.include?.items
          ? { items: mockStore.orderItems.filter((oi) => oi.orderId === updated.id) }
          : {}),
        ...(args?.include?.customer
          ? {
              customer: updated.customerId
                ? mockStore.customers.find((c) => c.id === updated.customerId) || null
                : null,
            }
          : {}),
      };
    },
    delete: async (args: { where: { id?: string; orderNumber?: string } }) => {
      const idx = mockStore.orders.findIndex(
        (o) =>
          (args.where.id && o.id === args.where.id) ||
          (args.where.orderNumber && o.orderNumber === args.where.orderNumber)
      );
      if (idx === -1) throw new Error("Order not found");
      const [deleted] = mockStore.orders.splice(idx, 1);
      mockStore.orderItems = mockStore.orderItems.filter(
        (oi) => oi.orderId !== deleted.id
      );
      persistFallbackSnapshot();
      return deleted;
    },
    count: async (args?: { where?: { status?: string } }) => {
      if (args?.where?.status) {
        return mockStore.orders.filter((o) => o.status === args.where!.status).length;
      }
      return mockStore.orders.length;
    },
    aggregate: async (args?: { where?: { status?: { not?: string } } }) => {
      const filtered = args?.where?.status?.not
        ? mockStore.orders.filter((o) => o.status !== args.where!.status!.not)
        : mockStore.orders;
      const totalSum = filtered.reduce((acc, o) => acc + (o.total || 0), 0);
      return { _sum: { total: totalSum } };
    },
  },
  orderItem: {
    findMany: async (args?: { where?: { orderId?: string } }) => {
      if (args?.where?.orderId) {
        return mockStore.orderItems.filter((oi) => oi.orderId === args.where!.orderId);
      }
      return [...mockStore.orderItems];
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const created: MockOrderItemRecord = {
        id: (args.data.id as string) || `oi_${Date.now()}`,
        orderId: String(args.data.orderId || ""),
        productId: (args.data.productId as string | null) ?? null,
        productName: String(args.data.productName || ""),
        variantName: (args.data.variantName as string | null) ?? null,
        quantity: Number(args.data.quantity || 1),
        unitPrice: Number(args.data.unitPrice || 0),
        lineTotal: Number(args.data.lineTotal || 0),
      };
      mockStore.orderItems.push(created);
      persistFallbackSnapshot();
      return created;
    },
    createMany: async (args: { data: Array<Record<string, unknown>> }) => {
      const items = Array.isArray(args.data) ? args.data : [];
      items.forEach((d, idx) => {
        mockStore.orderItems.push({
          id: (d.id as string) || `oi_${Date.now()}_${idx}`,
          orderId: String(d.orderId || ""),
          productId: (d.productId as string | null) ?? null,
          productName: String(d.productName || ""),
          variantName: (d.variantName as string | null) ?? null,
          quantity: Number(d.quantity || 1),
          unitPrice: Number(d.unitPrice || 0),
          lineTotal: Number(d.lineTotal || 0),
        });
      });
      persistFallbackSnapshot();
      return { count: items.length };
    },
    deleteMany: async (args?: { where?: { orderId?: string } }) => {
      const before = mockStore.orderItems.length;
      if (args?.where?.orderId) {
        mockStore.orderItems = mockStore.orderItems.filter(
          (oi) => oi.orderId !== args.where!.orderId
        );
      } else {
        mockStore.orderItems = [];
      }
      const count = before - mockStore.orderItems.length;
      if (count > 0) persistFallbackSnapshot();
      return { count };
    },
  },
  coupon: {
    findMany: async (args?: {
      where?: { isActive?: boolean; code?: string };
      orderBy?: unknown;
    }) => {
      let list = [...mockStore.coupons];
      if (args?.where) {
        if (args.where.isActive !== undefined) {
          list = list.filter((c) => c.isActive === args.where!.isActive);
        }
        if (args.where.code) {
          list = list.filter(
            (c) => c.code.toUpperCase() === args.where!.code!.toUpperCase()
          );
        }
      }
      if (args?.orderBy) {
        list = sortByOrderConfig(
          list as unknown as Array<Record<string, unknown>>,
          args.orderBy
        ) as unknown as MockCouponRecord[];
      }
      return list;
    },
    findUnique: async (args: { where: { id?: string; code?: string } }) => {
      return (
        mockStore.coupons.find(
          (c) =>
            (args.where.id && c.id === args.where.id) ||
            (args.where.code &&
              c.code.toUpperCase() === args.where.code.toUpperCase())
        ) || null
      );
    },
    findFirst: async (args?: {
      where?: {
        id?: string;
        code?: string;
        OR?: Array<{ id?: string; code?: string }>;
      };
    }) => {
      if (!args?.where) return mockStore.coupons[0] || null;
      return (
        mockStore.coupons.find((c) => {
          if (args.where!.id && c.id !== args.where!.id) return false;
          if (
            args.where!.code &&
            c.code.toUpperCase() !== args.where!.code.toUpperCase()
          ) {
            return false;
          }
          if (args.where!.OR) {
            return args.where!.OR.some(
              (cond) =>
                (cond.id && c.id === cond.id) ||
                (cond.code && c.code.toUpperCase() === cond.code.toUpperCase())
            );
          }
          return true;
        }) || null
      );
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const created: MockCouponRecord = {
        id: (args.data.id as string) || `cpn_${Date.now()}`,
        code: String(args.data.code || "").toUpperCase(),
        title: args.data.title ?? { tr: "", en: "" },
        discountType: String(args.data.discountType || "percentage"),
        discountValue: Number(args.data.discountValue || 0),
        minOrderAmount:
          args.data.minOrderAmount !== undefined && args.data.minOrderAmount !== null
            ? Number(args.data.minOrderAmount)
            : null,
        maxUses:
          args.data.maxUses !== undefined && args.data.maxUses !== null
            ? Number(args.data.maxUses)
            : null,
        usedCount: Number(args.data.usedCount ?? 0),
        isActive: args.data.isActive !== undefined ? Boolean(args.data.isActive) : true,
        startsAt: args.data.startsAt ? new Date(String(args.data.startsAt)) : null,
        expiresAt: args.data.expiresAt ? new Date(String(args.data.expiresAt)) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStore.coupons.push(created);
      persistFallbackSnapshot();
      return created;
    },
    update: async (args: {
      where: { id?: string; code?: string };
      data: Record<string, unknown>;
    }) => {
      const idx = mockStore.coupons.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.code &&
            c.code.toUpperCase() === args.where.code.toUpperCase())
      );
      if (idx === -1) throw new Error("Coupon not found");
      mockStore.coupons[idx] = {
        ...applyPrismaUpdateData(
          mockStore.coupons[idx] as unknown as Record<string, unknown>,
          args.data
        ),
        updatedAt: new Date(),
      } as unknown as MockCouponRecord;
      persistFallbackSnapshot();
      return mockStore.coupons[idx];
    },
    upsert: async (args: {
      where: { id?: string; code?: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const idx = mockStore.coupons.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.code &&
            c.code.toUpperCase() === args.where.code.toUpperCase())
      );
      if (idx === -1) {
        return mockHandlers.coupon.create({ data: args.create } as never);
      }
      mockStore.coupons[idx] = {
        ...applyPrismaUpdateData(
          mockStore.coupons[idx] as unknown as Record<string, unknown>,
          args.update
        ),
        updatedAt: new Date(),
      } as unknown as MockCouponRecord;
      persistFallbackSnapshot();
      return mockStore.coupons[idx];
    },
    delete: async (args: { where: { id?: string; code?: string } }) => {
      const idx = mockStore.coupons.findIndex(
        (c) =>
          (args.where.id && c.id === args.where.id) ||
          (args.where.code &&
            c.code.toUpperCase() === args.where.code.toUpperCase())
      );
      if (idx === -1) throw new Error("Coupon not found");
      const [deleted] = mockStore.coupons.splice(idx, 1);
      persistFallbackSnapshot();
      return deleted;
    },
    count: async () => mockStore.coupons.length,
  },
  storefrontSection: {
    findMany: async (args?: {
      where?: { isEnabled?: boolean; key?: string };
    }) => {
      let list = [...mockStore.storefrontSections];
      if (args?.where?.isEnabled !== undefined) {
        list = list.filter((s) => s.isEnabled === args.where!.isEnabled);
      }
      if (args?.where?.key) {
        list = list.filter((s) => s.key === args.where!.key);
      }
      return list;
    },
    findUnique: async (args: { where: { key?: string } }) => {
      if (!args?.where?.key) return null;
      return (
        mockStore.storefrontSections.find((s) => s.key === args.where.key) || null
      );
    },
    findFirst: async (args?: { where?: { key?: string } }) => {
      if (args?.where?.key) {
        return (
          mockStore.storefrontSections.find((s) => s.key === args.where!.key) ||
          null
        );
      }
      return mockStore.storefrontSections[0] || null;
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const created: MockStorefrontSectionRecord = {
        key: String(args.data.key || ""),
        data: args.data.data ?? {},
        isEnabled:
          args.data.isEnabled !== undefined ? Boolean(args.data.isEnabled) : true,
        updatedAt: new Date(),
      };
      mockStore.storefrontSections.push(created);
      persistFallbackSnapshot();
      return created;
    },
    update: async (args: {
      where: { key: string };
      data: Record<string, unknown>;
    }) => {
      const idx = mockStore.storefrontSections.findIndex(
        (s) => s.key === args.where.key
      );
      if (idx === -1) throw new Error("StorefrontSection not found");
      mockStore.storefrontSections[idx] = {
        ...applyPrismaUpdateData(
          mockStore.storefrontSections[idx] as unknown as Record<string, unknown>,
          args.data
        ),
        updatedAt: new Date(),
      } as unknown as MockStorefrontSectionRecord;
      persistFallbackSnapshot();
      return mockStore.storefrontSections[idx];
    },
    upsert: async (args: {
      where: { key: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const idx = mockStore.storefrontSections.findIndex(
        (s) => s.key === args.where.key
      );
      if (idx === -1) {
        return mockHandlers.storefrontSection.create({ data: args.create } as never);
      }
      mockStore.storefrontSections[idx] = {
        ...applyPrismaUpdateData(
          mockStore.storefrontSections[idx] as unknown as Record<string, unknown>,
          args.update
        ),
        updatedAt: new Date(),
      } as unknown as MockStorefrontSectionRecord;
      persistFallbackSnapshot();
      return mockStore.storefrontSections[idx];
    },
    delete: async (args: { where: { key: string } }) => {
      const idx = mockStore.storefrontSections.findIndex(
        (s) => s.key === args.where.key
      );
      if (idx === -1) throw new Error("StorefrontSection not found");
      const [deleted] = mockStore.storefrontSections.splice(idx, 1);
      persistFallbackSnapshot();
      return deleted;
    },
    count: async () => mockStore.storefrontSections.length,
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

const DB_QUERY_TIMEOUT_MS = 8000;
const DB_CIRCUIT_COOLDOWN_MS = 15000;

let dbCircuitOpenUntil = 0;

function isConnectionOrTimeoutError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  return (
    code === "P1001" ||
    code === "P1002" ||
    msg.includes("DB query timed out") ||
    msg.includes("Can't reach database") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("fetch failed")
  );
}

async function runWithDbTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`DB query timed out after ${DB_QUERY_TIMEOUT_MS}ms`));
        }, DB_QUERY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function createResilientPrismaClient(client: PrismaClient): PrismaClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "$transaction") {
        return async (
          arg:
            | ((tx: PrismaClient) => Promise<unknown>)
            | Array<Promise<unknown>>
        ) => {
          if (!isDbConfigured() || Date.now() < dbCircuitOpenUntil) {
            if (typeof arg === "function") {
              return await arg(receiver as PrismaClient);
            }
            return await Promise.all(arg);
          }
          try {
            return await runWithDbTimeout(
              (target.$transaction as (a: unknown) => Promise<unknown>)(arg)
            );
          } catch (err) {
            if (isConnectionOrTimeoutError(err)) {
              dbCircuitOpenUntil = Date.now() + DB_CIRCUIT_COOLDOWN_MS;
            }
            const errorMsg =
              err instanceof Error ? err.message : "connection error";
            console.warn(
              `[DB Fallback Interceptor] $transaction failed: ${errorMsg}. Executing fallback.`
            );
            if (typeof arg === "function") {
              return await arg(receiver as PrismaClient);
            }
            return await Promise.all(arg);
          }
        };
      }

      if (typeof prop === "string" && prop in mockHandlers) {
        const modelTarget = Reflect.get(target, prop, receiver);
        const mockModel = mockHandlers[prop];
        return new Proxy(modelTarget, {
          get(mTarget, mProp) {
            const originalMethod = Reflect.get(mTarget, mProp);
            if (typeof originalMethod === "function") {
              return async (...args: unknown[]) => {
                // In unconfigured / mock mode or open circuit, serve directly from resilient fallback store
                if (!isDbConfigured() || Date.now() < dbCircuitOpenUntil) {
                  if (
                    mockModel &&
                    typeof mockModel[mProp as string] === "function"
                  ) {
                    return mockModel[mProp as string](...(args as never[]));
                  }
                  return null;
                }
                // When configured, try real query with timeout, fallback if network, missing table, or timeout occurs
                try {
                  const result = await runWithDbTimeout(
                    originalMethod.apply(mTarget, args) as Promise<unknown>
                  );
                  const methodName = String(mProp);
                  const isMutation =
                    methodName === "create" ||
                    methodName === "update" ||
                    methodName === "upsert" ||
                    methodName === "delete" ||
                    methodName === "updateMany" ||
                    methodName === "deleteMany";

                  if (prop === "storeSettings" && result && typeof result === "object") {
                    mockStore.settings = {
                      ...mockStore.settings,
                      ...(result as Record<string, unknown>),
                    } as MockStoreSettingsRecord;
                  } else if (
                    prop === "storefrontSection" &&
                    isMutation &&
                    result &&
                    typeof result === "object"
                  ) {
                    const sec = result as MockStorefrontSectionRecord;
                    if (typeof sec.key === "string") {
                      const idx = mockStore.storefrontSections.findIndex(
                        (s) => s.key === sec.key
                      );
                      if (methodName === "delete") {
                        if (idx !== -1) mockStore.storefrontSections.splice(idx, 1);
                      } else if (idx !== -1) {
                        mockStore.storefrontSections[idx] = sec;
                      } else {
                        mockStore.storefrontSections.push(sec);
                      }
                    }
                  }

                  if (isMutation) {
                    persistFallbackSnapshot();
                  }
                  return result;
                } catch (err: unknown) {
                  if (isConnectionOrTimeoutError(err)) {
                    dbCircuitOpenUntil = Date.now() + DB_CIRCUIT_COOLDOWN_MS;
                  }
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

globalForPrisma.prisma = prisma;

export default prisma;
