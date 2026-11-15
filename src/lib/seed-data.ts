export interface ProductVariant {
  id: string;
  name: string;
  inStock: boolean;
  sku?: string;
  priceModifier?: number;
}

export interface SeedProductInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  variants: ProductVariant[];
  mediaUrls: string[];
  isBestseller: boolean;
}

export interface StoreSettingsInput {
  id: string;
  whatsappNumber: string;
  currency: string;
  brandMetadata: Record<string, unknown>;
}

export const INITIAL_STORE_SETTINGS: StoreSettingsInput = {
  id: "default",
  whatsappNumber: "+905551234567",
  currency: "USD",
  brandMetadata: {
    title: "cyrux studio",
    brandName: "cyrux studio",
    heroDisplayTitle: "cyrux",
    tagline: "wearable art & brutalist luxury",
    description:
      "avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments",
    socialHandles: {
      instagram: "@cyruxstudio",
      twitter: "@cyruxstudio",
      tiktok: "@cyruxstudio",
    },
    socialLinks: {
      instagram: "https://instagram.com/cyruxstudio",
      twitter: "https://x.com/cyruxstudio",
      tiktok: "https://tiktok.com/@cyruxstudio",
    },
    supportEmail: "contact@cyruxstudio.com",
    whatsappFormatted: "+90 (555) 123 45 67",
    location: "Cyprus • Global Express Dispatch",
    announcement: "FREE WORLDWIDE EXPRESS DISPATCH ON ALL CHAPTER00 ORDERS",
    heroDesktopImage: "/assets/editorial/hero-desktop.jpg",
    heroMobileImage: "/assets/editorial/hero-mobile.jpg",
    aboutDesktopImage: "/assets/editorial/about-desktop.jpg",
    aboutMobileImage: "/assets/editorial/about-mobile.jpg",
  },
};

export const SEED_PRODUCTS: SeedProductInput[] = [
  {
    id: "prod_1",
    name: "PRETTY CHAOS TEE",
    slug: "pretty-chaos-tee",
    description:
      "Heavyweight 280 GSM cotton jersey oversized tee featuring signature cyber-tribal predator halftone screenprint in punk magenta and neon accents. Vintage acid wash finish with dropped shoulders and thick ribbed neck.",
    price: 120.0,
    stock: 45,
    isBestseller: true,
    variants: [
      { id: "pc-s", name: "S", inStock: true, sku: "PC-TEE-S" },
      { id: "pc-m", name: "M", inStock: true, sku: "PC-TEE-M" },
      { id: "pc-l", name: "L", inStock: true, sku: "PC-TEE-L" },
      { id: "pc-xl", name: "XL", inStock: true, sku: "PC-TEE-XL" },
    ],
    mediaUrls: [
      "/assets/products/pretty-chaos-tee.png",
      "/assets/products/pretty-chaos-detail.webp",
    ],
  },
  {
    id: "prod_2",
    name: "FIRST ASCENT TEE - WHITE",
    slug: "first-ascent-tee-white",
    description:
      "Boxy silhouette streetwear tee crafted from 300 GSM combed cotton. High-density screenprinted albino viper emblem and cyrux brandmark. Chapter 00 First Ascent release with reinforced double-needle seams.",
    price: 95.0,
    stock: 30,
    isBestseller: true,
    variants: [
      { id: "fa-w-s", name: "S", inStock: true, sku: "FA-WHT-S" },
      { id: "fa-w-m", name: "M", inStock: true, sku: "FA-WHT-M" },
      { id: "fa-w-l", name: "L", inStock: true, sku: "FA-WHT-L" },
      { id: "fa-w-xl", name: "XL", inStock: false, sku: "FA-WHT-XL" },
    ],
    mediaUrls: ["/assets/products/first-ascent-white.png"],
  },
  {
    id: "prod_3",
    name: "FIRST ASCENT TEE - BLACK",
    slug: "first-ascent-tee-black",
    description:
      "Pitch black heavyweight dropped-shoulder boxy tee with high-contrast albino viper graphics and brutalist cyrux studio typography. Ribbed collar and raw garment-dyed treatment.",
    price: 95.0,
    stock: 50,
    isBestseller: true,
    variants: [
      { id: "fa-b-s", name: "S", inStock: true, sku: "FA-BLK-S" },
      { id: "fa-b-m", name: "M", inStock: true, sku: "FA-BLK-M" },
      { id: "fa-b-l", name: "L", inStock: true, sku: "FA-BLK-L" },
      { id: "fa-b-xl", name: "XL", inStock: true, sku: "FA-BLK-XL" },
    ],
    mediaUrls: ["/assets/products/first-ascent-black.png"],
  },
  {
    id: "prod_4",
    name: "CYRUX 099 ORBITAL TEE",
    slug: "cyrux-099-orbital-tee",
    description:
      "Astronomical cybernetic motif tee in deep washed charcoal. Center orbital star constellation with specular chrome micro-stud effect and studio trademark typographic lockup.",
    price: 110.0,
    stock: 25,
    isBestseller: true,
    variants: [
      { id: "orb-s", name: "S", inStock: true, sku: "ORB-099-S" },
      { id: "orb-m", name: "M", inStock: true, sku: "ORB-099-M" },
      { id: "orb-l", name: "L", inStock: true, sku: "ORB-099-L" },
    ],
    mediaUrls: ["/assets/products/cyrux-099-orbital.png"],
  },
  {
    id: "prod_5",
    name: "EYES NEVER LIE TEE",
    slug: "eyes-never-lie-tee",
    description:
      "Cinematic 35mm letterbox eye gaze screenprint on pitch black heavyweight cotton. Brutalist studio text treatment. Limited edition wearable art run.",
    price: 105.0,
    stock: 18,
    isBestseller: false,
    variants: [
      { id: "enl-s", name: "S", inStock: true, sku: "ENL-001-S" },
      { id: "enl-m", name: "M", inStock: true, sku: "ENL-001-M" },
      { id: "enl-l", name: "L", inStock: true, sku: "ENL-001-L" },
    ],
    mediaUrls: ["/assets/products/eyes-never-lie.png"],
  },
];
