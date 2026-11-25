import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";

export interface FormattedStoreSettings {
  id: string;
  whatsappNumber: string;
  currency: string;
  storeName: string;
  brandBio: string;
  announcement: string;
  socialLinks: Record<string, string>;
  socialHandles: Record<string, string>;
  supportEmail: string;
  whatsappFormatted: string;
  location: string;
  heroDesktopImage: string;
  heroMobileImage: string;
  aboutDesktopImage: string;
  aboutMobileImage: string;
  freeShippingThreshold: number | null;
  shippingFee: number;
  lowStockThreshold: number;
  activeTheme: "light" | "dark" | "atelier" | "white-atelier";
  announcementEnabled: boolean;
  defaultLang: "tr" | "en";
  updatedAt: string;
}

function cleanEditorialImageUrl(val: unknown, fallback: string): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (!trimmed || trimmed.includes("cyrux-store.public.blob.vercel-storage.com")) {
    return fallback;
  }
  return trimmed;
}

export function formatStoreSettings(record: {
  id: string;
  whatsappNumber: string;
  currency: string;
  brandMetadata: unknown;
  freeShippingThreshold?: number | null;
  shippingFee?: number | null;
  lowStockThreshold?: number | null;
  activeTheme?: string | null;
  announcementEnabled?: boolean | null;
  updatedAt?: Date | string;
} | null): FormattedStoreSettings {
  const brandMeta =
    (record?.brandMetadata as Record<string, unknown>) ||
    INITIAL_STORE_SETTINGS.brandMetadata;

  const announcement =
    typeof brandMeta.announcement === "string"
      ? (brandMeta.announcement as string)
      : "";

  const rawThreshold =
    record?.freeShippingThreshold !== undefined
      ? record.freeShippingThreshold
      : typeof brandMeta.freeShippingThreshold === "number"
      ? brandMeta.freeShippingThreshold
      : brandMeta.freeShippingThreshold === null
      ? null
      : INITIAL_STORE_SETTINGS.freeShippingThreshold ?? null;

  const freeShippingThreshold =
    typeof rawThreshold === "number" && Number.isFinite(rawThreshold)
      ? rawThreshold
      : null;

  const rawShippingFee =
    typeof record?.shippingFee === "number"
      ? record.shippingFee
      : typeof brandMeta.shippingFee === "number"
      ? brandMeta.shippingFee
      : INITIAL_STORE_SETTINGS.shippingFee ?? 0;

  const rawLowStock =
    typeof record?.lowStockThreshold === "number"
      ? record.lowStockThreshold
      : typeof brandMeta.lowStockThreshold === "number"
      ? brandMeta.lowStockThreshold
      : INITIAL_STORE_SETTINGS.lowStockThreshold ?? 3;

  const rawTheme =
    (typeof record?.activeTheme === "string" && record.activeTheme) ||
    (typeof brandMeta.activeTheme === "string" && brandMeta.activeTheme) ||
    INITIAL_STORE_SETTINGS.activeTheme ||
    "white-atelier";

  const activeTheme = (
    ["light", "dark", "atelier", "white-atelier"].includes(rawTheme)
      ? rawTheme
      : "white-atelier"
  ) as FormattedStoreSettings["activeTheme"];

  const announcementEnabled =
    typeof record?.announcementEnabled === "boolean"
      ? record.announcementEnabled
      : typeof brandMeta.announcementEnabled === "boolean"
      ? brandMeta.announcementEnabled
      : INITIAL_STORE_SETTINGS.announcementEnabled ?? true;

  const defaultLang =
    brandMeta.defaultLang === "en" ? "en" : "tr";

  return {
    id: record?.id || "default",
    whatsappNumber:
      record?.whatsappNumber || INITIAL_STORE_SETTINGS.whatsappNumber,
    currency: record?.currency || INITIAL_STORE_SETTINGS.currency,
    storeName:
      (brandMeta.storeName as string) ||
      (brandMeta.brandName as string) ||
      (brandMeta.title as string) ||
      "cyrux studio",
    brandBio:
      (brandMeta.tagline as string) ||
      (brandMeta.brandBio as string) ||
      (brandMeta.description as string) ||
      "wearable art & brutalist luxury",
    announcement,
    socialLinks:
      (brandMeta.socialLinks as Record<string, string>) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.socialLinks as Record<string, string>),
    socialHandles:
      (brandMeta.socialHandles as Record<string, string>) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.socialHandles as Record<string, string>),
    supportEmail:
      (brandMeta.supportEmail as string) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.supportEmail as string) ||
      "contact@cyruxstudio.com",
    whatsappFormatted:
      (brandMeta.whatsappFormatted as string) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.whatsappFormatted as string) ||
      "+90 (533) 873 77 12",
    location:
      (brandMeta.location as string) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.location as string) ||
      "Kuzey Kıbrıs • Global Express Dispatch",
    heroDesktopImage: cleanEditorialImageUrl(
      brandMeta.heroDesktopImage,
      "/assets/editorial/hero-desktop.jpg"
    ),
    heroMobileImage: cleanEditorialImageUrl(
      brandMeta.heroMobileImage,
      "/assets/editorial/hero-mobile.jpg"
    ),
    aboutDesktopImage: cleanEditorialImageUrl(
      brandMeta.aboutDesktopImage,
      "/assets/editorial/about-desktop.jpg"
    ),
    aboutMobileImage: cleanEditorialImageUrl(
      brandMeta.aboutMobileImage,
      "/assets/editorial/about-mobile.jpg"
    ),
    freeShippingThreshold,
    shippingFee: Number.isFinite(rawShippingFee) ? rawShippingFee : 0,
    lowStockThreshold: Number.isFinite(rawLowStock) ? rawLowStock : 3,
    activeTheme,
    announcementEnabled,
    defaultLang,
    updatedAt: record?.updatedAt
      ? new Date(record.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}
