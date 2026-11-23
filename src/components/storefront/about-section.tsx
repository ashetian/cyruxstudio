"use client";

import React from "react";
import Image from "next/image";
import { useLanguage } from "@/components/providers/language-provider";
import { DEFAULT_STOREFRONT_CMS, type AboutCmsData } from "@/lib/cms";

export interface AboutSectionProps {
  imageSrc?: string;
  desktopImageSrc?: string;
  mobileImageSrc?: string;
  aboutCms?: AboutCmsData | null;
  cms?: AboutCmsData | null;
}

export function AboutSection({
  imageSrc = "/assets/editorial/about-desktop.jpg",
  desktopImageSrc,
  mobileImageSrc,
  aboutCms,
  cms,
}: AboutSectionProps) {
  const { t } = useLanguage();
  const data = aboutCms ?? cms ?? DEFAULT_STOREFRONT_CMS.about;
  const resolvedDesktop = data.desktopImage || desktopImageSrc || imageSrc;
  const resolvedMobile = data.mobileImage || mobileImageSrc || imageSrc;
  const blocks = data.storyBlocks || [];

  return (
    <section
      id="about"
      aria-label="About Cyrux Studio"
      className="relative w-full min-h-screen bg-black select-none overflow-hidden flex items-center justify-center scroll-mt-0"
    >
      {/* Full-Bleed Editorial Visual Container */}
      <div className="relative w-full min-h-screen overflow-hidden flex flex-col justify-between">
        {/* Background Editorial Visuals */}
        <div className="absolute inset-0 w-full h-full">
          {/* Mobile View: Vertical Portrait */}
          <div className="block md:hidden absolute inset-0 w-full h-full">
            <Image
              src={resolvedMobile}
              alt={t(data.imageAlt)}
              fill
              priority
              unoptimized
              quality={100}
              sizes="100vw"
              className="object-cover object-center brightness-[0.78] contrast-[1.14]"
            />
          </div>
          {/* Desktop View: Widescreen Landscape */}
          <div className="hidden md:block absolute inset-0 w-full h-full">
            <Image
              src={resolvedDesktop}
              alt={t(data.imageAlt)}
              fill
              priority
              unoptimized
              quality={100}
              sizes="100vw"
              className="object-cover object-center brightness-[0.78] contrast-[1.14]"
            />
          </div>
        </div>

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 pointer-events-none" />

        {/* Monumental Typography Overlay */}
        <div className="relative z-10 w-full min-h-screen max-w-7xl mx-auto px-5 sm:px-10 md:px-14 pt-8 sm:pt-12 md:pt-16 pb-24 sm:pb-28 md:pb-24 flex flex-col justify-between opacity-100 gap-10">
          {/* Top Brand & Location Stamp */}
          <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neutral-300">
            <span className="font-semibold text-white tracking-widest">
              {data.brandStamp || "CYRUX STUDIO"}
            </span>
            <span className="text-neutral-400">
              {t(data.locationStamp)}
            </span>
          </div>

          {/* Monumental Headline & Story Blocks */}
          <div className="max-w-5xl space-y-8">
            <h2 className="font-sans text-2xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight leading-[0.98] sm:leading-[0.94] text-white">
              <span className="block text-white">
                {t(data.headlineLine1)}
              </span>
              <span className="block text-white/55">
                {t(data.headlineLine2)}
              </span>
              <span className="block text-white">
                {t(data.headlineLine3)}
              </span>
            </h2>

            {blocks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/15">
                {blocks.map((block) => (
                  <div key={block.id} className="space-y-2">
                    <div className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
                      [{block.index}] {t(block.title)}
                    </div>
                    <p className="font-mono text-xs text-neutral-300 leading-relaxed">
                      {t(block.body)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
