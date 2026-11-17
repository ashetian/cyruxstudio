import { INITIAL_STORE_SETTINGS } from "@/lib/seed-data";

export function formatStoreSettings(record: {
  id: string;
  whatsappNumber: string;
  currency: string;
  brandMetadata: unknown;
  updatedAt?: Date | string;
} | null) {
  const brandMeta =
    (record?.brandMetadata as Record<string, unknown>) ||
    INITIAL_STORE_SETTINGS.brandMetadata;

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
    announcement:
      typeof brandMeta.announcement === "string"
        ? (brandMeta.announcement as string)
        : "",
    socialLinks: (brandMeta.socialLinks as Record<string, string>) ||
      INITIAL_STORE_SETTINGS.brandMetadata.socialLinks,
    supportEmail:
      (brandMeta.supportEmail as string) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.supportEmail as string) ||
      "contact@cyruxstudio.com",
    whatsappFormatted:
      (brandMeta.whatsappFormatted as string) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.whatsappFormatted as string) ||
      "+90 533 873 77 12",
    location:
      (brandMeta.location as string) ||
      (INITIAL_STORE_SETTINGS.brandMetadata.location as string) ||
      "Kuzey Kıbrıs • Global Express Dispatch",
    heroDesktopImage:
      (brandMeta.heroDesktopImage as string) ||
      "/assets/editorial/hero-desktop.jpg",
    heroMobileImage:
      (brandMeta.heroMobileImage as string) ||
      "/assets/editorial/hero-mobile.jpg",
    aboutDesktopImage:
      (brandMeta.aboutDesktopImage as string) ||
      "/assets/editorial/about-desktop.jpg",
    aboutMobileImage:
      (brandMeta.aboutMobileImage as string) ||
      "/assets/editorial/about-mobile.jpg",
    updatedAt: record?.updatedAt
      ? new Date(record.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}
