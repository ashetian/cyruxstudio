export interface ProductVariant {
  id: string;
  name: string;
  inStock: boolean;
  sku?: string;
  priceModifier?: number;
  size?: string;
  color?: string;
  colorHex?: string;
  imageUrl?: string;
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
  color?: string;
  colorHex?: string;
  twinProductSlug?: string;
  isDiptych?: boolean;
}

export interface StoreSettingsInput {
  id: string;
  whatsappNumber: string;
  currency: string;
  brandMetadata: Record<string, unknown>;
}

export const INITIAL_STORE_SETTINGS: StoreSettingsInput = {
  id: "default",
  whatsappNumber: "+905338737712",
  currency: "EUR",
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
    whatsappFormatted: "+90 (533) 873 77 12",
    location: "Kuzey Kıbrıs • Global Express Dispatch",
    announcement: "",
    heroDesktopImage: "/assets/editorial/hero-desktop.jpg",
    heroMobileImage: "/assets/editorial/hero-mobile.jpg",
    aboutDesktopImage: "/assets/editorial/about-desktop.jpg",
    aboutMobileImage: "/assets/editorial/about-mobile.jpg",
  },
};

export const SEED_PRODUCTS: SeedProductInput[] = [
  {
    id: "prod_1",
    name: "CYRUX PRETTY CHAOS TEE",
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
    name: "Chapter001 – First Ascent",
    slug: "chapter001-first-ascent",
    description:
      "Boxy silhouette dropped-shoulder streetwear tee crafted from 300 GSM combed cotton. High-contrast albino viper screenprint and brutalist cyrux studio typography. Available in washed black and off-white colorways. Chapter 00 First Ascent release.",
    price: 95.0,
    stock: 80,
    isBestseller: true,
    variants: [
      { id: "fa-b-s", name: "BLACK / S", size: "S", color: "Black", colorHex: "#0A0A0A", inStock: true, sku: "FA-BLK-S", imageUrl: "/assets/products/first-ascent-black.png" },
      { id: "fa-b-m", name: "BLACK / M", size: "M", color: "Black", colorHex: "#0A0A0A", inStock: true, sku: "FA-BLK-M", imageUrl: "/assets/products/first-ascent-black.png" },
      { id: "fa-b-l", name: "BLACK / L", size: "L", color: "Black", colorHex: "#0A0A0A", inStock: true, sku: "FA-BLK-L", imageUrl: "/assets/products/first-ascent-black.png" },
      { id: "fa-b-xl", name: "BLACK / XL", size: "XL", color: "Black", colorHex: "#0A0A0A", inStock: true, sku: "FA-BLK-XL", imageUrl: "/assets/products/first-ascent-black.png" },
      { id: "fa-w-s", name: "WHITE / S", size: "S", color: "White", colorHex: "#FAF8F3", inStock: true, sku: "FA-WHT-S", imageUrl: "/assets/products/first-ascent-white.png" },
      { id: "fa-w-m", name: "WHITE / M", size: "M", color: "White", colorHex: "#FAF8F3", inStock: true, sku: "FA-WHT-M", imageUrl: "/assets/products/first-ascent-white.png" },
      { id: "fa-w-l", name: "WHITE / L", size: "L", color: "White", colorHex: "#FAF8F3", inStock: true, sku: "FA-WHT-L", imageUrl: "/assets/products/first-ascent-white.png" },
      { id: "fa-w-xl", name: "WHITE / XL", size: "XL", color: "White", colorHex: "#FAF8F3", inStock: false, sku: "FA-WHT-XL", imageUrl: "/assets/products/first-ascent-white.png" },
    ],
    mediaUrls: [
      "/assets/products/first-ascent-black.png",
      "/assets/products/first-ascent-white.png",
    ],
  },
  {
    id: "prod_4",
    name: "CYRUX STUDIO 099 — THE NEW ERA OF WEARABLE ART",
    slug: "cyrux-099-orbital-tee",
    description:
      "Astronomical cybernetic motif tee in deep washed charcoal. Front features center orbital star constellation with specular chrome micro-stud effect. Back features cinematic 35mm letterbox eye gaze screenprint with brutalist studio text treatment. Chapter 00 release.",
    price: 110.0,
    stock: 25,
    isBestseller: true,
    color: "Washed Charcoal",
    colorHex: "#222224",
    isDiptych: true,
    variants: [
      { id: "orb-s", name: "S", size: "S", inStock: true, sku: "ORB-099-S" },
      { id: "orb-m", name: "M", size: "M", inStock: true, sku: "ORB-099-M" },
      { id: "orb-l", name: "L", size: "L", inStock: true, sku: "ORB-099-L" },
      { id: "orb-xl", name: "XL", size: "XL", inStock: true, sku: "ORB-099-XL" },
    ],
    mediaUrls: [
      "/assets/products/cyrux-099-orbital.png",
      "/assets/products/eyes-never-lie.png",
    ],
  },
];

export interface InitialDropInput {
  id: string;
  slug: string;
  number: string;
  chapter: string;
  title: string;
  status: "active" | "archived" | "upcoming";
  releaseDate: {
    tr: string;
    en: string;
  };
  edition: {
    tr: string;
    en: string;
  };
  description: {
    tr: string;
    en: string;
  };
  productSlugs: string[];
  bannerImage: string;
  totalPieces: number;
}

export const INITIAL_DROPS: InitialDropInput[] = [
  {
    id: "drop-01",
    slug: "first-ascent",
    number: "01",
    chapter: "CHAPTER 00",
    title: "FIRST ASCENT",
    status: "active",
    releaseDate: {
      tr: "KASIM 2026",
      en: "NOVEMBER 2026",
    },
    edition: {
      tr: "3 MODEL • ÖZEL ARŞİV DROPU",
      en: "3 GARMENTS • ARCHIVAL DROP",
    },
    description: {
      tr: "Chapter 00 İlk Drop; hazır modanın tekdüze kalıplarını reddeden 3 giyilebilir sanat parçasından oluşur. 280-300 GSM ağır taranmış pamuk, el işçiliği asit yıkama ve avangart serigrafi baskılarla Kuzey Kıbrıs atölyemizde üretilmiştir. Asla tekrar basılmayacaktır.",
      en: "Chapter 00 First Ascent consists of 3 wearable art sculptures rejecting fast fashion templates. Crafted from 280-300 GSM combed cotton with vintage acid washes and raw serigraphy at our North Cyprus atelier. Never restocked.",
    },
    productSlugs: [
      "pretty-chaos-tee",
      "chapter001-first-ascent",
      "cyrux-099-orbital-tee",
    ],
    bannerImage: "/assets/editorial/hero-desktop.jpg",
    totalPieces: 150,
  },
];

