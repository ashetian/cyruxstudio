"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import {
  DEFAULT_STOREFRONT_CMS,
  type BilingualText,
  type CollectionsSectionCmsData,
} from "@/lib/cms";

export interface FeaturedCollectionItem {
  id: string;
  slug: string;
  name: string | BilingualText | unknown;
  description?: string | BilingualText | unknown;
  imageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface FeaturedCollectionsProps {
  collections?: FeaturedCollectionItem[];
  collectionsSection?: CollectionsSectionCmsData | null;
  cms?: CollectionsSectionCmsData | null;
  className?: string;
}

function resolveLocalized(
  val: unknown,
  t: (input: { tr: string; en: string }) => string,
  fallback = ""
): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const rec = val as { tr?: string; en?: string };
    return t({
      tr: rec.tr || rec.en || fallback,
      en: rec.en || rec.tr || fallback,
    });
  }
  return fallback;
}

export function FeaturedCollections({
  collections = [],
  collectionsSection,
  cms,
  className = "",
}: FeaturedCollectionsProps) {
  const { t } = useLanguage();
  const sectionCopy =
    collectionsSection ?? cms ?? DEFAULT_STOREFRONT_CMS.collectionsSection;

  const activeCollections = collections.filter((c) => c.isActive !== false);
  if (activeCollections.length === 0) {
    return null;
  }

  return (
    <section
      id="collections"
      aria-label="Featured Collections"
      className={`w-full max-w-7xl mx-auto px-4 md:px-12 py-12 md:py-16 border-t border-black/10 ${className}`}
    >
      <div className="mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h2 className="font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-black">
            {t(sectionCopy.featuredTitle)}
          </h2>
          <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest mt-1">
            {t(sectionCopy.featuredSubtitle)}
          </p>
        </div>
        <Link
          href="/shop"
          className="min-h-[44px] inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-black hover:opacity-60 transition-opacity cursor-pointer"
        >
          <span>{t(sectionCopy.exploreCta)}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeCollections.map((col, idx) => {
          const title = resolveLocalized(col.name, t, col.slug);
          const desc = resolveLocalized(col.description, t, "");
          const img = col.imageUrl || "/assets/editorial/hero-desktop.jpg";

          return (
            <Link
              key={col.id}
              href={`/shop?collection=${encodeURIComponent(col.slug)}`}
              className="group relative flex flex-col justify-between border border-black/15 bg-[#FAF8F3] hover:border-black transition-colors overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <div className="relative aspect-[4/3] w-full bg-[#EDEDEB] overflow-hidden">
                <Image
                  src={img}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 font-mono text-[10px] font-bold uppercase tracking-widest bg-black/85 text-[#FAF8F3] px-2 py-0.5">
                  [{String(idx + 1).padStart(2, "0")}]
                </span>
              </div>
              <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-t border-black/10">
                <div className="min-w-0">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-black truncate">
                    {title}
                  </h3>
                  {desc && (
                    <p className="font-mono text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                      {desc}
                    </p>
                  )}
                </div>
                <span className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center border border-black/20 group-hover:bg-black group-hover:text-[#FAF8F3] transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default FeaturedCollections;
