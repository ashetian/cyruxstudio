import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { sanitizeAdminText, sanitizeCmsUrl } from "@/lib/validations";

export const CMS_SECTION_KEYS = [
  "hero",
  "marquee",
  "lookbook",
  "about",
  "faq",
  "contact",
  "legal",
  "footer",
  "navigation",
  "seo",
  "collectionsSection",
] as const;

export type CmsSectionKey = (typeof CMS_SECTION_KEYS)[number];

export interface BilingualText {
  tr: string;
  en: string;
}

export const bilingualTextSchema = z.object({
  tr: z.string().trim().max(5000).transform(sanitizeAdminText),
  en: z.string().trim().max(5000).transform(sanitizeAdminText),
});

const safeUrlStringSchema = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? "" : sanitizeCmsUrl(v)));

const safeTextSchema = (max = 500) =>
  z.string().trim().max(max).transform(sanitizeAdminText);

export interface HeroCmsData {
  eyebrow: BilingualText;
  headline: BilingualText;
  subcopy: BilingualText;
  primaryCtaLabel: BilingualText;
  primaryCtaHref: string;
  secondaryCtaLabel: BilingualText;
  secondaryCtaHref: string;
  desktopImage: string;
  mobileImage: string;
  videoUrl: string;
  imageAlt: BilingualText;
  show3DLogo: boolean;
  showHeadlines: boolean;
  showCtas: boolean;
  showSearchPill: boolean;
  latestDropPillLabel: BilingualText;
  searchPlaceholder: BilingualText;
  suggestedSearchTerms: string[];
}

export interface MarqueeItemCms {
  id: string;
  text: BilingualText;
  href?: string;
}

export interface MarqueeCmsData {
  enabled: boolean;
  speedSeconds: number;
  pauseOnHover: boolean;
  items: MarqueeItemCms[];
}

export interface LookbookCardCms {
  imageUrl: string;
  alt: BilingualText;
  badge: BilingualText;
  href?: string;
}

export interface LookbookGalleryItemCms {
  id: string;
  imageUrl: string;
  title: BilingualText;
  caption: BilingualText;
  tag: string;
}

export interface LookbookCmsData {
  enabled: boolean;
  eyebrow: BilingualText;
  subtitle: BilingualText;
  card1: LookbookCardCms;
  card2: LookbookCardCms;
  videoUrl: string;
  posterUrl: string;
  videoBadge: BilingualText;
  gallery: LookbookGalleryItemCms[];
}

export interface AboutStoryBlockCms {
  id: string;
  index: string;
  title: BilingualText;
  body: BilingualText;
}

export interface AboutCmsData {
  brandStamp: string;
  locationStamp: BilingualText;
  headlineLine1: BilingualText;
  headlineLine2: BilingualText;
  headlineLine3: BilingualText;
  desktopImage: string;
  mobileImage: string;
  imageAlt: BilingualText;
  storyBlocks: AboutStoryBlockCms[];
}

export interface FaqItemCms {
  id: string;
  category: string;
  question: BilingualText;
  answer: BilingualText;
}

export interface FaqCmsData {
  enabled: boolean;
  eyebrow: BilingualText;
  title: BilingualText;
  subtitle: BilingualText;
  items: FaqItemCms[];
}

export interface ContactCmsData {
  enabled: boolean;
  eyebrow: BilingualText;
  title: BilingualText;
  subtitle: BilingualText;
  supportEmail: string;
  whatsappNumber: string;
  whatsappFormatted: string;
  whatsappDefaultMessage: BilingualText;
  atelierAddress: BilingualText;
  workingHours: BilingualText;
  socialLinks: {
    instagram: string;
    twitter: string;
    tiktok: string;
  };
}

export interface LegalSectionItemCms {
  index: string;
  title: BilingualText;
  body: BilingualText;
}

export interface LegalTabCms {
  id: "privacy" | "terms" | "shipping" | "sales";
  label: BilingualText;
  badge: BilingualText;
  sections: LegalSectionItemCms[];
}

export interface LegalCmsData {
  modalTitle: BilingualText;
  archiveTag: string;
  studioLocation: string;
  tabs: LegalTabCms[];
}

export interface FooterNavRowCms {
  id: string;
  index: string;
  label: BilingualText;
  href: string;
  actionType: "scroll" | "route" | "whatsapp" | "external";
}

export interface FooterCmsData {
  navRows: FooterNavRowCms[];
  logoUrl: string;
  logoAlt: string;
  copyrightText: string;
  rightsText: BilingualText;
  creditPrefix: string;
  creditAuthor: string;
  creditUrl: string;
  legalLabels: {
    privacy: BilingualText;
    terms: BilingualText;
    shipping: BilingualText;
    sales: BilingualText;
  };
}

export interface NavigationFloatingItemCms {
  id: string;
  label: BilingualText;
  href: string;
  isBrand: boolean;
}

export interface NavigationDrawerLinkCms {
  id: string;
  label: BilingualText;
  href: string;
}

export interface NavigationCmsData {
  floatingItems: NavigationFloatingItemCms[];
  drawerLinks: NavigationDrawerLinkCms[];
  drawerFooterStamp: BilingualText;
  notFoundEyebrow: BilingualText;
  notFoundTitle: BilingualText;
  notFoundBody: BilingualText;
  notFoundCta: BilingualText;
}

export interface SeoCmsData {
  siteUrl: string;
  titleDefault: string;
  titleTemplate: string;
  description: string;
  keywords: string[];
  ogImage: string;
  ogAlt: string;
  twitterCreator: string;
  twitterSite: string;
  defaultLang: "tr" | "en";
  themeColor: string;
  showLookbookSection: boolean;
  showCollectionsSection: boolean;
  showFaqSection: boolean;
  showContactSection: boolean;
}

export interface CollectionsSectionCmsData {
  bestsellerTitle: BilingualText;
  bestsellerSubtitle: BilingualText;
  featuredTitle: BilingualText;
  featuredSubtitle: BilingualText;
  exploreCta: BilingualText;
  seeDropCta: BilingualText;
  soldOutLabel: BilingualText;
  cardProvenanceTag: BilingualText;
  popularSearchTags: string[];
  productDetailsDefaults: {
    provenanceTag: BilingualText;
    vatDispatchLabel: BilingualText;
    fitLabel: BilingualText;
    fabric: string;
    fit: string;
    printTechnique: string;
    edition: string;
    shippingNote: BilingualText;
  };
}

export interface StorefrontCmsConfig {
  hero: HeroCmsData;
  marquee: MarqueeCmsData;
  lookbook: LookbookCmsData;
  about: AboutCmsData;
  faq: FaqCmsData;
  contact: ContactCmsData;
  legal: LegalCmsData;
  footer: FooterCmsData;
  navigation: NavigationCmsData;
  seo: SeoCmsData;
  collectionsSection: CollectionsSectionCmsData;
}

export const cmsHeroSchema = z.object({
  eyebrow: bilingualTextSchema,
  headline: bilingualTextSchema,
  subcopy: bilingualTextSchema,
  primaryCtaLabel: bilingualTextSchema,
  primaryCtaHref: safeUrlStringSchema,
  secondaryCtaLabel: bilingualTextSchema,
  secondaryCtaHref: safeUrlStringSchema,
  desktopImage: safeUrlStringSchema,
  mobileImage: safeUrlStringSchema,
  videoUrl: safeUrlStringSchema,
  imageAlt: bilingualTextSchema,
  show3DLogo: z.boolean(),
  showHeadlines: z.boolean(),
  showCtas: z.boolean(),
  showSearchPill: z.boolean(),
  latestDropPillLabel: bilingualTextSchema,
  searchPlaceholder: bilingualTextSchema,
  suggestedSearchTerms: z.array(safeTextSchema(60)).max(20),
});

export const cmsMarqueeSchema = z.object({
  enabled: z.boolean(),
  speedSeconds: z.number().min(8).max(120),
  pauseOnHover: z.boolean(),
  items: z
    .array(
      z.object({
        id: safeTextSchema(80),
        text: bilingualTextSchema,
        href: safeUrlStringSchema.optional(),
      })
    )
    .max(20),
});

const lookbookCardSchema = z.object({
  imageUrl: safeUrlStringSchema,
  alt: bilingualTextSchema,
  badge: bilingualTextSchema,
  href: safeUrlStringSchema.optional(),
});

export const cmsLookbookSchema = z.object({
  enabled: z.boolean(),
  eyebrow: bilingualTextSchema,
  subtitle: bilingualTextSchema,
  card1: lookbookCardSchema,
  card2: lookbookCardSchema,
  videoUrl: safeUrlStringSchema,
  posterUrl: safeUrlStringSchema,
  videoBadge: bilingualTextSchema,
  gallery: z
    .array(
      z.object({
        id: safeTextSchema(80),
        imageUrl: safeUrlStringSchema,
        title: bilingualTextSchema,
        caption: bilingualTextSchema,
        tag: safeTextSchema(80),
      })
    )
    .max(30),
});

export const cmsAboutSchema = z.object({
  brandStamp: safeTextSchema(120),
  locationStamp: bilingualTextSchema,
  headlineLine1: bilingualTextSchema,
  headlineLine2: bilingualTextSchema,
  headlineLine3: bilingualTextSchema,
  desktopImage: safeUrlStringSchema,
  mobileImage: safeUrlStringSchema,
  imageAlt: bilingualTextSchema,
  storyBlocks: z
    .array(
      z.object({
        id: safeTextSchema(80),
        index: safeTextSchema(20),
        title: bilingualTextSchema,
        body: bilingualTextSchema,
      })
    )
    .max(20),
});

export const cmsFaqSchema = z.object({
  enabled: z.boolean(),
  eyebrow: bilingualTextSchema,
  title: bilingualTextSchema,
  subtitle: bilingualTextSchema,
  items: z
    .array(
      z.object({
        id: safeTextSchema(80),
        category: safeTextSchema(80).optional().default("general"),
        question: bilingualTextSchema,
        answer: bilingualTextSchema,
      })
    )
    .max(50),
});

export const cmsContactSchema = z.object({
  enabled: z.boolean(),
  eyebrow: bilingualTextSchema,
  title: bilingualTextSchema,
  subtitle: bilingualTextSchema,
  supportEmail: z.string().trim().email().max(255),
  whatsappNumber: safeTextSchema(40),
  whatsappFormatted: safeTextSchema(60),
  whatsappDefaultMessage: bilingualTextSchema,
  atelierAddress: bilingualTextSchema,
  workingHours: bilingualTextSchema,
  socialLinks: z.object({
    instagram: safeUrlStringSchema,
    twitter: safeUrlStringSchema,
    tiktok: safeUrlStringSchema,
  }),
});

export const cmsLegalSchema = z.object({
  modalTitle: bilingualTextSchema,
  archiveTag: safeTextSchema(80),
  studioLocation: safeTextSchema(120),
  tabs: z
    .array(
      z.object({
        id: z.enum(["privacy", "terms", "shipping", "sales"]),
        label: bilingualTextSchema,
        badge: bilingualTextSchema,
        sections: z
          .array(
            z.object({
              index: safeTextSchema(20),
              title: bilingualTextSchema,
              body: bilingualTextSchema,
            })
          )
          .max(20),
      })
    )
    .max(10),
});

export const cmsFooterSchema = z.object({
  navRows: z
    .array(
      z.object({
        id: safeTextSchema(80),
        index: safeTextSchema(20),
        label: bilingualTextSchema,
        href: safeUrlStringSchema,
        actionType: z.enum(["scroll", "route", "whatsapp", "external"]),
      })
    )
    .max(12),
  logoUrl: safeUrlStringSchema,
  logoAlt: safeTextSchema(120),
  copyrightText: safeTextSchema(120),
  rightsText: bilingualTextSchema,
  creditPrefix: safeTextSchema(60),
  creditAuthor: safeTextSchema(80),
  creditUrl: safeUrlStringSchema,
  legalLabels: z.object({
    privacy: bilingualTextSchema,
    terms: bilingualTextSchema,
    shipping: bilingualTextSchema,
    sales: bilingualTextSchema,
  }),
});

export const cmsNavigationSchema = z.object({
  floatingItems: z
    .array(
      z.object({
        id: safeTextSchema(80),
        label: bilingualTextSchema,
        href: safeUrlStringSchema,
        isBrand: z.boolean(),
      })
    )
    .max(10),
  drawerLinks: z
    .array(
      z.object({
        id: safeTextSchema(80),
        label: bilingualTextSchema,
        href: safeUrlStringSchema,
      })
    )
    .max(16),
  drawerFooterStamp: bilingualTextSchema,
  notFoundEyebrow: bilingualTextSchema,
  notFoundTitle: bilingualTextSchema,
  notFoundBody: bilingualTextSchema,
  notFoundCta: bilingualTextSchema,
});

export const cmsSeoSchema = z.object({
  siteUrl: safeUrlStringSchema,
  titleDefault: safeTextSchema(160),
  titleTemplate: safeTextSchema(100),
  description: safeTextSchema(400),
  keywords: z.array(safeTextSchema(60)).max(30),
  ogImage: safeUrlStringSchema,
  ogAlt: safeTextSchema(160),
  twitterCreator: safeTextSchema(60),
  twitterSite: safeTextSchema(60),
  defaultLang: z.enum(["tr", "en"]),
  themeColor: safeTextSchema(30),
  showLookbookSection: z.boolean(),
  showCollectionsSection: z.boolean(),
  showFaqSection: z.boolean(),
  showContactSection: z.boolean(),
});

export const cmsCollectionsSectionSchema = z.object({
  bestsellerTitle: bilingualTextSchema,
  bestsellerSubtitle: bilingualTextSchema,
  featuredTitle: bilingualTextSchema,
  featuredSubtitle: bilingualTextSchema,
  exploreCta: bilingualTextSchema,
  seeDropCta: bilingualTextSchema,
  soldOutLabel: bilingualTextSchema,
  cardProvenanceTag: bilingualTextSchema,
  popularSearchTags: z.array(safeTextSchema(60)).max(20),
  productDetailsDefaults: z.object({
    provenanceTag: bilingualTextSchema,
    vatDispatchLabel: bilingualTextSchema,
    fitLabel: bilingualTextSchema,
    fabric: safeTextSchema(160),
    fit: safeTextSchema(160),
    printTechnique: safeTextSchema(160),
    edition: safeTextSchema(160),
    shippingNote: bilingualTextSchema,
  }),
});

export const cmsSectionSchemaMap: Record<CmsSectionKey, z.ZodType<unknown>> = {
  hero: cmsHeroSchema,
  marquee: cmsMarqueeSchema,
  lookbook: cmsLookbookSchema,
  about: cmsAboutSchema,
  faq: cmsFaqSchema,
  contact: cmsContactSchema,
  legal: cmsLegalSchema,
  footer: cmsFooterSchema,
  navigation: cmsNavigationSchema,
  seo: cmsSeoSchema,
  collectionsSection: cmsCollectionsSectionSchema,
};

export const DEFAULT_STOREFRONT_CMS: StorefrontCmsConfig = {
  hero: {
    eyebrow: {
      tr: "BÖLÜM 00 • İLK ARŞİV",
      en: "CHAPTER 00 • INAUGURAL ARCHIVE",
    },
    headline: {
      tr: "cyrux studio",
      en: "cyrux studio",
    },
    subcopy: {
      tr: "Kuzey Kıbrıs atölyesinden sınırlı sayıda üretilen giyilebilir sanat ve ağır gramajlı sokak giyimi.",
      en: "Limited archival wearable art and heavyweight cotton silhouettes crafted at our North Cyprus atelier.",
    },
    primaryCtaLabel: {
      tr: "KOLEKSİYONU KEŞFET",
      en: "EXPLORE COLLECTION",
    },
    primaryCtaHref: "#shop",
    secondaryCtaLabel: {
      tr: "SON DROP",
      en: "LATEST DROP",
    },
    secondaryCtaHref: "/drops/latest",
    desktopImage: "/assets/editorial/hero-desktop.jpg",
    mobileImage: "/assets/editorial/hero-mobile.jpg",
    videoUrl: "",
    imageAlt: {
      tr: "Cyrux Studio Editoryal Portre",
      en: "Cyrux Studio Archival Editorial Portrait",
    },
    show3DLogo: true,
    showHeadlines: false,
    showCtas: false,
    showSearchPill: true,
    latestDropPillLabel: {
      tr: "SON DROP",
      en: "LATEST DROP",
    },
    searchPlaceholder: {
      tr: "ara...",
      en: "Search...",
    },
    suggestedSearchTerms: ["T-Shirt", "Hoodie", "Oversize", "Pants"],
  },
  marquee: {
    enabled: true,
    speedSeconds: 28,
    pauseOnHover: true,
    items: [
      {
        id: "mq-1",
        text: {
          tr: "BÖLÜM 00 • FIRST ASCENT ŞİMDİ YAYINDA",
          en: "CHAPTER 00 • FIRST ASCENT NOW LIVE",
        },
        href: "/drops/latest",
      },
      {
        id: "mq-2",
        text: {
          tr: "280–300 GSM AĞIR TARANMIŞ PAMUK • KUZEY KIBRIS ATÖLYESİ",
          en: "280–300 GSM COMBED COTTON • NORTH CYPRUS ATELIER",
        },
        href: "/about",
      },
      {
        id: "mq-3",
        text: {
          tr: "SINIRLI ARŞİV ÜRETİMİ • YENİDEN BASIM YOKTUR",
          en: "LIMITED ARCHIVAL EDITION • NEVER RESTOCKED",
        },
        href: "/drops",
      },
    ],
  },
  lookbook: {
    enabled: true,
    eyebrow: {
      tr: "EDİTORYAL ARŞİV • BÖLÜM 00",
      en: "EDITORIAL ARCHIVE • CHAPTER 00",
    },
    subtitle: {
      tr: "DİJİTAL FİLM & FİZİKSEL PARÇALAR",
      en: "DIGITAL FILM & PHYSICAL PIECES",
    },
    card1: {
      imageUrl: "/assets/campaign/campaign-card-puffer.webp",
      alt: {
        tr: "Cyrux Studio Lookbook Modeli",
        en: "Cyrux Studio Lookbook Silhouette",
      },
      badge: {
        tr: "01 • ARŞİV",
        en: "01 • ARCHIVE",
      },
      href: "/drops/latest",
    },
    card2: {
      imageUrl: "/assets/campaign/campaign-card-chrome-shoe.webp",
      alt: {
        tr: "Cyrux Studio Heykelsi Metalik Çalışma",
        en: "Cyrux Studio Sculptural Metallic Study",
      },
      badge: {
        tr: "02 • ATÖLYE",
        en: "02 • ATELIER",
      },
      href: "/shop",
    },
    videoUrl: "/assets/video/cyrux-campaign-1080.mp4",
    posterUrl: "/assets/video/cyrux-campaign-poster.webp",
    videoBadge: {
      tr: "EDİTORYAL KAMPANYA • BÖLÜM 00",
      en: "EDITORIAL CAMPAIGN • CHAPTER 00",
    },
    gallery: [
      {
        id: "lb-1",
        imageUrl: "/assets/campaign/campaign-lookbook-model.webp",
        title: {
          tr: "Bölüm 00 • First Ascent",
          en: "Chapter 00 • First Ascent",
        },
        caption: {
          tr: "300 GSM taranmış pamuk ve el işçiliği serigrafi.",
          en: "300 GSM combed cotton with hand-pulled serigraphy.",
        },
        tag: "CHAPTER 00",
      },
      {
        id: "lb-2",
        imageUrl: "/assets/campaign/campaign-card-puffer.webp",
        title: {
          tr: "Silüet Çalışması",
          en: "Silhouette Study",
        },
        caption: {
          tr: "Kuzey Kıbrıs atölyesinde üretilen sınırlı arşiv serisi.",
          en: "Limited archival run produced at the North Cyprus atelier.",
        },
        tag: "ATELIER",
      },
    ],
  },
  about: {
    brandStamp: "CYRUX STUDIO",
    locationStamp: {
      tr: "KUZEY KIBRIS ATÖLYESİ",
      en: "NORTH CYPRUS ATELIER",
    },
    headlineLine1: {
      tr: "HAZIR MODA SEVMİYORUZ.",
      en: "WE REJECT FAST FASHION.",
    },
    headlineLine2: {
      tr: "GİYİLEBİLİR SANAT.",
      en: "WEARABLE ART.",
    },
    headlineLine3: {
      tr: "SİZİ YANSITAN PARÇALAR.",
      en: "SHAPED FOR YOUR ESSENCE.",
    },
    desktopImage: "/assets/editorial/about-desktop.jpg",
    mobileImage: "/assets/editorial/about-mobile.jpg",
    imageAlt: {
      tr: "Cyrux Studio Giyilebilir Sanat",
      en: "Cyrux Studio Wearable Art",
    },
    storyBlocks: [
      {
        id: "about-1",
        index: "01",
        title: {
          tr: "280–300 GSM Ağır Taranmış Pamuk",
          en: "280–300 GSM Heavy Combed Cotton",
        },
        body: {
          tr: "Her Cyrux Studio parçası formunu koruyan kalın taranmış pamuk dokusu, düşük omuzlu kutu kesim ve kalın yaka ribanası ile uzun ömürlü bir silüet sunar.",
          en: "Each Cyrux Studio garment is cut from dense combed cotton jersey with architectural dropped shoulders and reinforced ribbing engineered to hold its drape.",
        },
      },
      {
        id: "about-2",
        index: "02",
        title: {
          tr: "Sınırlı Arşiv Üretimi",
          en: "Limited Archival Production",
        },
        body: {
          tr: "Koleksiyonlar bağımsız bölümler halinde numaralandırılır. Bir drop tükendiğinde kalıplar kasaya kaldırılır ve aynı tasarım bir daha üretilmez.",
          en: "Collections are numbered as self-contained chapters. Once an edition sells through, screens and patterns are archived and never restocked.",
        },
      },
      {
        id: "about-3",
        index: "03",
        title: {
          tr: "Kuzey Kıbrıs Atölyesi",
          en: "North Cyprus Atelier",
        },
        body: {
          tr: "Girne merkezli stüdyomuzda tasarlanan tüm grafikler, asit yıkama ve serigrafi baskı aşamaları doğrudan atölye denetiminden geçer.",
          en: "Designed in Kyrenia, North Cyprus, every print, acid wash, and finishing detail is overseen directly by our studio team.",
        },
      },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: {
      tr: "SIKÇA SORULAN SORULAR",
      en: "FREQUENTLY ASKED QUESTIONS",
    },
    title: {
      tr: "ATÖLYE REHBERİ",
      en: "ATELIER GUIDE",
    },
    subtitle: {
      tr: "Kumaş gramajı, beden seçimi, sınırlı üretim droplar ve kargo süreçleri.",
      en: "Fabric weight, sizing, limited archival drops, and global dispatch.",
    },
    items: [
      {
        id: "faq-1",
        category: "Sizing",
        question: {
          tr: "Kalıplar ve beden seçimi nasıldır?",
          en: "How do the silhouettes fit?",
        },
        answer: {
          tr: "Parçalarımız kutu kesim (boxy) ve düşük omuzlu oversize kalıptadır. Rahat stüdyo duruşu için kendi bedeninizi, daha dökümlü bir görünüm için bir beden büyük tercih edebilirsiniz.",
          en: "Our garments feature a boxy, dropped-shoulder oversize silhouette. Choose your true size for the intended atelier drape, or size up for extra volume.",
        },
      },
      {
        id: "faq-2",
        category: "Care",
        question: {
          tr: "280–300 GSM pamuklu ürünleri nasıl yıkamalıyım?",
          en: "How should I care for 280–300 GSM combed cotton pieces?",
        },
        answer: {
          tr: "Kumaş dokusunu ve serigrafi baskıyı korumak için 30°C'de ters çevirerek yıkayın, kurutma makinesi kullanmayın ve baskı yüzeyine doğrudan ütü uygulamayın.",
          en: "Wash inside-out at 30°C, avoid tumble drying, and never iron directly over screenprints to preserve both cotton density and artwork.",
        },
      },
      {
        id: "faq-3",
        category: "Drops",
        question: {
          tr: "Tükenen droplar tekrar stoğa giriyor mu?",
          en: "Are sold-out archival drops restocked?",
        },
        answer: {
          tr: "Hayır. Her Cyrux Studio dropu tek seferlik sınırlı arşiv serisi olarak üretilir; tükenen parçalar yeniden basılmaz.",
          en: "No. Every Cyrux Studio drop is produced as a one-time archival run and is never restocked once sold out.",
        },
      },
      {
        id: "faq-4",
        category: "Ordering",
        question: {
          tr: "WhatsApp üzerinden sipariş süreci nasıl işler?",
          en: "How does WhatsApp concierge ordering work?",
        },
        answer: {
          tr: "Sepetinizi veya seçtiğiniz parçayı onayladığınızda sipariş özetiniz doğrudan WhatsApp konsiyerj hattımıza iletilir. Anlık stok ve beden teyidinin ardından ödeme ve kargo adımı tamamlanır.",
          en: "Submitting your bag or item routes a verified order summary to our WhatsApp concierge. Once stock and sizing are confirmed, payment and dispatch details are finalized directly.",
        },
      },
      {
        id: "faq-5",
        category: "Shipping",
        question: {
          tr: "Teslimat süresi ve iade koşulları nelerdir?",
          en: "What are the dispatch times and return policy?",
        },
        answer: {
          tr: "Onaylanan siparişler 1–3 iş günü içinde kargoya verilir. Kuzey Kıbrıs içi kurye, Türkiye ve dünya geneline takipli ekspres hava kargo sağlanır. Teslimattan itibaren 14 gün içinde kullanılmamış ve etiketli ürünlerde değişim veya iade yapılır.",
          en: "Confirmed orders ship within 1–3 business days via local courier in North Cyprus and tracked express air freight to Turkey and worldwide. Unworn items with tags may be returned or exchanged within 14 days.",
        },
      },
    ],
  },
  contact: {
    enabled: true,
    eyebrow: {
      tr: "İLETİŞİM & KONSİYERJ",
      en: "CONTACT & CONCIERGE",
    },
    title: {
      tr: "STÜDYO İLE İLETİŞİM",
      en: "ATELIER CONCIERGE",
    },
    subtitle: {
      tr: "Beden danışmanlığı, sipariş takibi ve özel talepler için doğrudan stüdyomuza ulaşın.",
      en: "Reach our atelier directly for sizing guidance, order tracking, and bespoke inquiries.",
    },
    supportEmail: "contact@cyruxstudio.com",
    whatsappNumber: "+905338737712",
    whatsappFormatted: "+90 (533) 873 77 12",
    whatsappDefaultMessage: {
      tr: "Merhaba Cyrux Studio, mevcut parçalar ve beden ölçüleri hakkında bilgi almak istiyorum.",
      en: "Hello Cyrux Studio, I would like to inquire about current pieces and sizing.",
    },
    atelierAddress: {
      tr: "Girne, Kuzey Kıbrıs",
      en: "Kyrenia, North Cyprus",
    },
    workingHours: {
      tr: "Pazartesi – Cumartesi • 10:00 – 19:00 (EET)",
      en: "Monday – Saturday • 10:00 – 19:00 (EET)",
    },
    socialLinks: {
      instagram: "https://instagram.com/cyruxstudio",
      twitter: "https://x.com/cyruxstudio",
      tiktok: "https://tiktok.com/@cyruxstudio",
    },
  },
  legal: {
    modalTitle: {
      tr: "YASAL BİLGİLENDİRME",
      en: "LEGAL NOTICE",
    },
    archiveTag: "CYRUX ARCHIVE",
    studioLocation: "CYRUX STUDIO • GIRNE",
    tabs: [
      {
        id: "privacy",
        label: { tr: "Gizlilik & Çerez", en: "Privacy & Cookies" },
        badge: { tr: "KVKK & GİZLİLİK POLİTİKASI", en: "PRIVACY & COOKIE POLICY" },
        sections: [
          {
            index: "01",
            title: {
              tr: "Veri Sorumlusu & Taahhüt",
              en: "Data Controller & Commitment",
            },
            body: {
              tr: "Cyrux Studio (Girne, Kuzey Kıbrıs) ziyaretçilerinin ve müşterilerinin kişisel verilerinin korunmasına en üst düzeyde önem verir. Verileriniz KVKK ve uluslararası veri koruma standartlarına tam uyum içinde işlenir.",
              en: "Cyrux Studio (Kyrenia, North Cyprus) treats the protection of customer and visitor personal data with utmost priority, in accordance with applicable data protection standards.",
            },
          },
          {
            index: "02",
            title: {
              tr: "İşlenen Veriler & Kullanım Amacı",
              en: "Collected Data & Purpose",
            },
            body: {
              tr: "Sipariş teyidi, beden danışmanlığı ve teslimat süreçlerinde WhatsApp veya formlar üzerinden ilettiğiniz ad, telefon numarası ve teslimat adresi yalnızca siparişin kusursuz tamamlanması amacıyla kullanılır.",
              en: "Name, phone number, and delivery address provided via WhatsApp or forms during ordering and sizing consultations are used solely to fulfill and dispatch your archival garments.",
            },
          },
          {
            index: "03",
            title: {
              tr: "Üçüncü Taraflarla Paylaşım",
              en: "Third-Party Disclosure",
            },
            body: {
              tr: "Kişisel verileriniz asla reklam veya pazarlama amacıyla üçüncü şahıslara satılmaz veya devredilmez. Bilgiler yalnızca yetkili kargo ve lojistik firmalarıyla zorunlu sevkiyat amacıyla paylaşılır.",
              en: "Your personal data is never sold or transferred to third parties for marketing purposes. Data is strictly shared with authorized logistics couriers solely for package delivery.",
            },
          },
          {
            index: "04",
            title: {
              tr: "Çerezler & Yerel Hafıza",
              en: "Cookies & Local Storage",
            },
            body: {
              tr: "Sitemizde kullanıcı deneyimini optimize etmek, dil tercihinizi (TR/EN) ve sepetinizi oturum boyunca hatırlamak için temel teknik çerezler ile yerel depolama kullanılmaktadır.",
              en: "Our site uses essential technical cookies and local storage solely to remember your preferred language (TR/EN) and keep track of items added to your shopping bag.",
            },
          },
        ],
      },
      {
        id: "terms",
        label: { tr: "Kullanım Koşulları", en: "Terms of Use" },
        badge: { tr: "STÜDYO KULLANIM ŞARTLARI", en: "STUDIO TERMS OF SERVICE" },
        sections: [
          {
            index: "01",
            title: {
              tr: "Fikri Mülkiyet & Telif Hakları",
              en: "Intellectual Property Rights",
            },
            body: {
              tr: "Cyrux Studio bünyesinde sergilenen tüm grafikler, tipografiler, 3D modeller, koleksiyon isimleri ve fotoğraf çekimleri tescilli stüdyo mülkiyetidir. İzinsiz ticari kullanımı, kopyalanması veya taklit edilmesi yasaktır.",
              en: "All artworks, typography, 3D assets, collection names, and editorial imagery showcased by Cyrux Studio are proprietary works. Unauthorized duplication or commercial use is strictly prohibited.",
            },
          },
          {
            index: "02",
            title: {
              tr: "Sınırlı Arşiv Üretimi (Drops)",
              en: "Limited Archival Drops",
            },
            body: {
              tr: "Her Cyrux Studio koleksiyonu bağımsız bir sanat serisi olarak sınırlı sayıda üretilir. Bir drop tükendiğinde kalıplar ve serigrafi şablonları kasaya kaldırılır; ürünler asla tekrar basılmaz.",
              en: "Every Cyrux Studio collection is produced as a limited edition run. Once an archival drop is sold out, patterns and screens are permanently vaulted; garments are never restocked.",
            },
          },
          {
            index: "03",
            title: {
              tr: "Fiyatlandırma & Stok Doğrulaması",
              en: "Pricing & Stock Verification",
            },
            body: {
              tr: "Sitede belirtilen fiyatlar nihai tüketici fiyatlarıdır. Siparişler, WhatsApp konsiyerj hattımız üzerinden stok ve beden teyidi yapıldıktan sonra kesinlik kazanır.",
              en: "Prices displayed reflect current atelier rates. Orders are officially confirmed upon real-time stock and size verification via our WhatsApp concierge.",
            },
          },
          {
            index: "04",
            title: {
              tr: "Yıkama & Bakım Sorumluluğu",
              en: "Garment Care & Responsibility",
            },
            body: {
              tr: "280-300 GSM ağır taranmış pamuk kumaşların ve özel serigrafi baskıların ömrünü korumak için 30°C ters çevirerek yıkama ve baskı üzerine direkt ütü basmama kurallarına uyulmalıdır.",
              en: "To preserve 280-300 GSM heavy combed cotton and raw serigraphy, garments must be washed inside-out at 30°C and never ironed directly over screenprints.",
            },
          },
        ],
      },
      {
        id: "shipping",
        label: { tr: "Teslimat & İade", en: "Shipping & Returns" },
        badge: { tr: "LOJİSTİK VE İADE POLİTİKASI", en: "LOGISTICS & RETURNS POLICY" },
        sections: [
          {
            index: "01",
            title: {
              tr: "Paketleme & Hazırlık Süresi",
              en: "Preparation & Dispatch",
            },
            body: {
              tr: "Onaylanan tüm siparişler stüdyomuzda kalite kontrolden geçirilerek 1-3 iş günü içerisinde kargo firmasına teslim edilir. Takip numarası doğrudan WhatsApp üzerinden iletilir.",
              en: "Confirmed orders pass quality inspection at our atelier and are dispatched within 1-3 business days. Tracking details are provided directly via WhatsApp.",
            },
          },
          {
            index: "02",
            title: {
              tr: "Teslimat Bölgeleri",
              en: "Shipping Destinations",
            },
            body: {
              tr: "Kuzey Kıbrıs içi hızlı kurye servisi, Türkiye ve diğer ülkelere anlaşmalı hava kargo ile güvenli ekspres teslimat gerçekleştirilir.",
              en: "Domestic courier service within North Cyprus, and tracked express air freight for Turkey and international delivery.",
            },
          },
          {
            index: "03",
            title: {
              tr: "14 Gün İade & Değişim Hakkı",
              en: "14-Day Return & Exchange",
            },
            body: {
              tr: "Teslim aldığınız tarihten itibaren 14 gün içinde değişim veya iade talebinde bulunabilirsiniz. Ürünün yıkanmamış, giyilmemiş, koku/leke içermeyen ve orijinal etiketli durumda olması şarttır.",
              en: "Returns or exchanges can be requested within 14 days of delivery. Garments must be unworn, unwashed, odor-free, and retain all original atelier tags and packaging.",
            },
          },
          {
            index: "04",
            title: {
              tr: "Kargo Masrafları",
              en: "Shipping Fees for Returns",
            },
            body: {
              tr: "Kusurlu veya yanlış gönderilen parçaların kargo bedeli Cyrux Studio tarafından karşılanır. Beden değişimi durumunda kargo alıcıya aittir.",
              en: "Defective or incorrect items will have all shipping costs covered by Cyrux Studio. Size exchange shipping charges are borne by the customer.",
            },
          },
        ],
      },
      {
        id: "sales",
        label: { tr: "Mesafeli Satış", en: "Distance Sales" },
        badge: { tr: "RESMİ BİLDİRİM & SÖZLEŞME", en: "LEGAL NOTICE & CONTRACT" },
        sections: [
          {
            index: "01",
            title: {
              tr: "Satıcı & Atölye Bilgileri",
              en: "Seller & Atelier Details",
            },
            body: {
              tr: "Satıcı: Cyrux Studio | Lokasyon: Girne, Kuzey Kıbrıs Türk Cumhuriyeti | İletişim: WhatsApp Konsiyerj Hattı & Resmi Instagram (@cyruxstudio).",
              en: "Seller: Cyrux Studio | Location: Kyrenia, Turkish Republic of Northern Cyprus | Channel: WhatsApp Concierge Line & Instagram (@cyruxstudio).",
            },
          },
          {
            index: "02",
            title: {
              tr: "Sözleşmenin Konusu",
              en: "Subject of Contract",
            },
            body: {
              tr: "İşbu sözleşme, alıcının web sitesi ve stüdyo konsiyerj kanalları üzerinden elektronik ortamda siparişini verdiği sanatsal giyim ürünlerinin satışı ve teslimini kapsar.",
              en: "This agreement covers the purchase, sale, and delivery of archival apparel pieces ordered electronically through the atelier's web and concierge channels.",
            },
          },
          {
            index: "03",
            title: {
              tr: "Cayma Hakkı İstisnaları",
              en: "Exemptions to Withdrawal",
            },
            body: {
              tr: "Alıcının talebi üzerine özel olarak revize edilen, tadilat uygulanan veya kişiselleştirilen parçalarda mevzuat gereğince cayma hakkı kullanılamaz.",
              en: "In accordance with consumer regulations, garments customized, altered, or tailor-modified specifically upon customer request are exempt from withdrawal rights.",
            },
          },
          {
            index: "04",
            title: {
              tr: "Yetkili Merci & Çözüm",
              en: "Jurisdiction & Resolution",
            },
            body: {
              tr: "Her türlü geri bildirim ve talep için öncelikli olarak Cyrux Studio doğrudan çözüm hattı geçerlidir. İhtilaf durumlarında Kuzey Kıbrıs Tüketici Mahkemeleri ve Hakem Heyetleri yetkilidir.",
              en: "For all support inquiries, Cyrux Studio's direct concierge serves as the primary resolution channel. In legal disputes, local consumer jurisdiction applies.",
            },
          },
        ],
      },
    ],
  },
  footer: {
    navRows: [
      {
        id: "fn-1",
        index: "01",
        label: { tr: "MAĞAZA", en: "SHOP" },
        href: "#shop",
        actionType: "scroll",
      },
      {
        id: "fn-2",
        index: "02",
        label: { tr: "DROPLAR", en: "DROPS" },
        href: "/drops",
        actionType: "route",
      },
      {
        id: "fn-3",
        index: "03",
        label: { tr: "WHATSAPP", en: "WHATSAPP" },
        href: "",
        actionType: "whatsapp",
      },
      {
        id: "fn-4",
        index: "04",
        label: { tr: "INSTAGRAM", en: "INSTAGRAM" },
        href: "",
        actionType: "external",
      },
    ],
    logoUrl: "/assets/brand/logo-emblem-white.webp",
    logoAlt: "Cyrux Studio",
    copyrightText: "CYRUX STUDIO",
    rightsText: {
      tr: "TÜM HAKLARI SAKLIDIR",
      en: "ALL RIGHTS RESERVED",
    },
    creditPrefix: "made with",
    creditAuthor: "ashetian_",
    creditUrl: "https://instagram.com/ashetian_",
    legalLabels: {
      privacy: { tr: "Gizlilik & Çerez", en: "Privacy" },
      terms: { tr: "Kullanım Koşulları", en: "Terms" },
      shipping: { tr: "Teslimat & İade", en: "Shipping" },
      sales: { tr: "Mesafeli Satış", en: "Sales Policy" },
    },
  },
  navigation: {
    floatingItems: [
      {
        id: "nav-brand",
        label: { tr: "cyrux", en: "cyrux" },
        href: "#hero",
        isBrand: true,
      },
      {
        id: "nav-shop",
        label: { tr: "Mağaza", en: "Shop" },
        href: "#shop",
        isBrand: false,
      },
      {
        id: "nav-drop",
        label: { tr: "Son Drop", en: "Latest Drop" },
        href: "/drops/latest",
        isBrand: false,
      },
      {
        id: "nav-about",
        label: { tr: "Hakkında", en: "About" },
        href: "#about",
        isBrand: false,
      },
    ],
    drawerLinks: [
      {
        id: "dl-shop",
        label: { tr: "Mağaza", en: "Shop" },
        href: "#shop",
      },
      {
        id: "dl-collections",
        label: { tr: "Koleksiyonlar", en: "Collections" },
        href: "/shop",
      },
      {
        id: "dl-about",
        label: { tr: "Hakkında", en: "About" },
        href: "#about",
      },
      {
        id: "dl-faq",
        label: { tr: "SSS", en: "FAQ" },
        href: "/faq",
      },
      {
        id: "dl-contact",
        label: { tr: "İletişim", en: "Contact" },
        href: "/contact",
      },
    ],
    drawerFooterStamp: {
      tr: "KUZEY KIBRIS ATÖLYESİ • CYRUX STUDIO",
      en: "NORTH CYPRUS ATELIER • CYRUX STUDIO",
    },
    notFoundEyebrow: {
      tr: "[ 404 ]",
      en: "[ 404 ]",
    },
    notFoundTitle: {
      tr: "PARÇA BULUNAMADI",
      en: "PIECE NOT FOUND",
    },
    notFoundBody: {
      tr: "Aradığınız ürün veya arşiv sayfası mevcut değil veya yayından kaldırılmış olabilir.",
      en: "The requested garment or archive page could not be found.",
    },
    notFoundCta: {
      tr: "ANA SAYFAYA DÖN",
      en: "RETURN HOME",
    },
  },
  seo: {
    siteUrl: "https://cyruxstudio.com",
    titleDefault: "CYRUX STUDIO | Wearable Art & Brutalist Streetwear",
    titleTemplate: "%s | CYRUX STUDIO",
    description:
      "Avant-garde archival streetwear, high-contrast monochrome silhouettes and sculptural garments engineered at our North Cyprus atelier.",
    keywords: [
      "cyrux studio",
      "wearable art",
      "archival streetwear",
      "archival fashion",
      "limited drop",
      "north cyprus atelier",
    ],
    ogImage: "/og-image.jpg",
    ogAlt: "CYRUX STUDIO - Wearable Art & Brutalist Streetwear",
    twitterCreator: "@ashetian_",
    twitterSite: "@cyruxstudio",
    defaultLang: "tr",
    themeColor: "#0A0A0A",
    showLookbookSection: true,
    showCollectionsSection: true,
    showFaqSection: true,
    showContactSection: true,
  },
  collectionsSection: {
    bestsellerTitle: {
      tr: "Bestseller Now",
      en: "Bestseller Now",
    },
    bestsellerSubtitle: {
      tr: "Stüdyo Seçkisi • Koleksiyon Parçaları",
      en: "Studio Selection • Collection Pieces",
    },
    featuredTitle: {
      tr: "KOLEKSİYONLAR",
      en: "COLLECTIONS",
    },
    featuredSubtitle: {
      tr: "Kürasyonlu Atölye Serileri",
      en: "Curated Atelier Series",
    },
    exploreCta: {
      tr: "İNCELE",
      en: "EXPLORE",
    },
    seeDropCta: {
      tr: "DROPU İNCELE",
      en: "SEE DROP",
    },
    soldOutLabel: {
      tr: "TÜKENDİ",
      en: "SOLD OUT",
    },
    cardProvenanceTag: {
      tr: "ATÖLYE BASKISI",
      en: "ARCHIVAL EDITION",
    },
    popularSearchTags: [
      "T-Shirt",
      "Hoodie",
      "Oversize",
      "Jacket",
      "Pants",
      "Archive",
    ],
    productDetailsDefaults: {
      provenanceTag: {
        tr: "BÖLÜM 00 • İLK ARŞİV",
        en: "CHAPTER 00 • FIRST ASCENT",
      },
      vatDispatchLabel: {
        tr: "KDV Dahil • 1-3 İş Günü Kargo",
        en: "VAT Included • 1-3 Day Dispatch",
      },
      fitLabel: {
        tr: "Kalıp & Beden",
        en: "Sizing & Fit",
      },
      fabric: "280–300 GSM Heavy Combed Cotton",
      fit: "Boxy Dropped-Shoulder Oversize",
      printTechnique: "Artisanal Serigraphy & Vintage Wash",
      edition: "Limited Archival Run • Never Restocked",
      shippingNote: {
        tr: "Kuzey Kıbrıs içi hızlı kurye, Türkiye ve uluslararası takipli ekspres hava kargo.",
        en: "Local courier in North Cyprus; tracked express air dispatch to Turkey and worldwide.",
      },
    },
  },
};

export function isCmsSectionKey(value: string): value is CmsSectionKey {
  return (CMS_SECTION_KEYS as readonly string[]).includes(value);
}

export function validateCmsSectionData<K extends CmsSectionKey>(
  section: K,
  input: unknown,
  base?: StorefrontCmsConfig[K]
): StorefrontCmsConfig[K] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Invalid payload for CMS section "${section}"`);
  }
  const inputRecord = input as Record<string, unknown>;
  if (Object.keys(inputRecord).length === 0) {
    throw new Error(`Empty payload for CMS section "${section}"`);
  }
  const reference = base ?? structuredClone(DEFAULT_STOREFRONT_CMS[section]);
  const normalizedInput: Record<string, unknown> = { ...inputRecord };
  if (section === "seo") {
    const refSeo = reference as SeoCmsData;
    if (
      typeof normalizedInput.title === "string" &&
      normalizedInput.title.trim().length > 0 &&
      (normalizedInput.titleDefault === undefined ||
        normalizedInput.titleDefault === refSeo.titleDefault)
    ) {
      normalizedInput.titleDefault = normalizedInput.title;
    }
  }
  if (section === "marquee") {
    if (
      typeof normalizedInput.visible === "boolean" &&
      normalizedInput.enabled === undefined
    ) {
      normalizedInput.enabled = normalizedInput.visible;
    }
  }
  const validKeys = new Set(Object.keys(reference as unknown as Record<string, unknown>));
  const hasKnownKey = Object.keys(normalizedInput).some((k) => validKeys.has(k));
  if (!hasKnownKey) {
    throw new Error(`No valid fields provided for CMS section "${section}"`);
  }
  const merged = {
    ...(reference as unknown as Record<string, unknown>),
    ...normalizedInput,
  };
  const schema = cmsSectionSchemaMap[section];
  return schema.parse(merged) as StorefrontCmsConfig[K];
}

export async function getStorefrontCms(): Promise<StorefrontCmsConfig> {
  const result = structuredClone(DEFAULT_STOREFRONT_CMS);
  try {
    const rows = await prisma.storefrontSection.findMany();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (!row || typeof row.key !== "string" || !isCmsSectionKey(row.key)) {
          continue;
        }
        const key = row.key;
        const candidate =
          row.data && typeof row.data === "object" && !Array.isArray(row.data)
            ? {
                ...(result[key] as unknown as Record<string, unknown>),
                ...(row.data as Record<string, unknown>),
              }
            : null;
        if (!candidate) continue;
        const parsed = cmsSectionSchemaMap[key].safeParse(candidate);
        if (parsed.success) {
          (result as unknown as Record<string, unknown>)[key] = parsed.data;
        }
      }
    }
  } catch (err) {
    console.warn("[CMS Service] Failed to read StorefrontSection rows, serving defaults:", err);
  }
  return result;
}

export async function getCmsSection<K extends CmsSectionKey>(
  section: K
): Promise<StorefrontCmsConfig[K]> {
  const base = structuredClone(DEFAULT_STOREFRONT_CMS[section]);
  try {
    const row = await prisma.storefrontSection.findUnique({
      where: { key: section },
    });
    if (row?.data && typeof row.data === "object" && !Array.isArray(row.data)) {
      const merged = {
        ...(base as unknown as Record<string, unknown>),
        ...(row.data as Record<string, unknown>),
      };
      const parsed = cmsSectionSchemaMap[section].safeParse(merged);
      if (parsed.success) {
        return parsed.data as StorefrontCmsConfig[K];
      }
    }
  } catch (err) {
    console.warn(`[CMS Service] Failed to read section "${section}":`, err);
  }
  return base;
}

export async function updateCmsSection<K extends CmsSectionKey>(
  section: K,
  input: unknown
): Promise<StorefrontCmsConfig[K]> {
  const current = await getCmsSection(section);
  const validated = validateCmsSectionData(section, input, current);

  await prisma.storefrontSection.upsert({
    where: { key: section },
    create: {
      key: section,
      data: validated as unknown as Prisma.InputJsonValue,
      isEnabled: true,
    },
    update: {
      data: validated as unknown as Prisma.InputJsonValue,
    },
  });

  return validated;
}
