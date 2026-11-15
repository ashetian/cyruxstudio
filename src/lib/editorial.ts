import fs from "fs";
import path from "path";

const EDITORIAL_DIR = path.join(process.cwd(), "public", "assets", "editorial");
const EDITORIAL_URL = "/assets/editorial";

/** Product slug -> editorial image file name. */
export const PRODUCT_EDITORIAL_FILES: Record<string, string> = {
  "pretty-chaos-tee": "p-pretty-chaos-tee.jpg",
  "first-ascent-tee-white": "p-first-ascent-white.jpg",
  "first-ascent-tee-black": "p-first-ascent-black.jpg",
  "cyrux-099-orbital-tee": "p-cyrux-099-orbital.jpg",
  "eyes-never-lie-tee": "p-eyes-never-lie.jpg",
};

export interface EditorialAssets {
  hero: string;
  heroDesktop: string;
  heroMobile: string;
  aboutDesktop: string;
  aboutMobile: string;
  /** Slug -> image URL (editorial file if present, else product fallback). */
  productImages: Record<string, string>;
  campaign: {
    main: string;
    portrait: string;
    object: string;
    video: string;
    poster: string;
  };
}

function editorialUrl(file: string): string | null {
  try {
    return fs.existsSync(path.join(EDITORIAL_DIR, file))
      ? `${EDITORIAL_URL}/${file}`
      : null;
  } catch {
    return null;
  }
}

export function resolveEditorialAssets(
  products: { slug: string; mediaUrls: string[] }[],
  brandMetadata?: Record<string, unknown> | null
): EditorialAssets {
  const meta = brandMetadata || {};

  const heroDesktop =
    (typeof meta.heroDesktopImage === "string" && meta.heroDesktopImage.trim()) ||
    editorialUrl("hero-desktop.jpg") ||
    "/assets/editorial/hero-desktop.jpg";

  const heroMobile =
    (typeof meta.heroMobileImage === "string" && meta.heroMobileImage.trim()) ||
    editorialUrl("hero-mobile.jpg") ||
    "/assets/editorial/hero-mobile.jpg";

  const aboutDesktop =
    (typeof meta.aboutDesktopImage === "string" && meta.aboutDesktopImage.trim()) ||
    editorialUrl("about-desktop.jpg") ||
    "/assets/editorial/about-desktop.jpg";

  const aboutMobile =
    (typeof meta.aboutMobileImage === "string" && meta.aboutMobileImage.trim()) ||
    editorialUrl("about-mobile.jpg") ||
    "/assets/editorial/about-mobile.jpg";

  const hero =
    heroDesktop ||
    editorialUrl("hero.jpg") ||
    "/assets/brand/hero-cyber-portrait.webp";

  const productImages: Record<string, string> = {};
  for (const p of products) {
    const file = PRODUCT_EDITORIAL_FILES[p.slug];
    const editorial = file ? editorialUrl(file) : null;
    productImages[p.slug] =
      p.mediaUrls[0] || editorial || "/assets/brand/logo-emblem-dark.png";
  }

  const mainPoster =
    editorialUrl("campaign-main.jpg") || "/assets/video/cyrux-campaign-poster.webp";

  return {
    hero,
    heroDesktop,
    heroMobile,
    aboutDesktop,
    aboutMobile,
    productImages,
    campaign: {
      main: mainPoster,
      portrait:
        editorialUrl("campaign-portrait.jpg") ||
        "/assets/campaign/campaign-card-puffer.webp",
      object:
        editorialUrl("campaign-object.jpg") ||
        "/assets/campaign/campaign-card-chrome-shoe.webp",
      video:
        editorialUrl("campaign-video.mp4") ||
        "/assets/video/cyrux-campaign-1080.mp4",
      poster: mainPoster,
    },
  };
}
