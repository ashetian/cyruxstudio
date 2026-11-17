"use client";

import React from "react";
import Image from "next/image";
import { useLanguage } from "@/components/providers/language-provider";

export interface AboutSectionProps {
  imageSrc?: string;
  desktopImageSrc?: string;
  mobileImageSrc?: string;
}

export function AboutSection({
  imageSrc = "/assets/editorial/about-desktop.jpg",
  desktopImageSrc,
  mobileImageSrc,
}: AboutSectionProps) {
  const { t } = useLanguage();

  return (
    <section
      id="about"
      aria-label="About Cyrux Studio"
      className="relative w-full min-h-screen h-screen h-[100dvh] bg-black select-none overflow-hidden flex items-center justify-center scroll-mt-0"
    >
      {/* Full-Bleed Editorial Visual Container */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Background Editorial Visuals */}
        <div className="absolute inset-0 w-full h-full">
          {/* Mobile View: Vertical Portrait */}
          <div className="block md:hidden absolute inset-0 w-full h-full">
            <Image
              src={mobileImageSrc || imageSrc}
              alt="Cyrux Studio Wearable Art Visual Mobile"
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
              src={desktopImageSrc || imageSrc}
              alt="Cyrux Studio Wearable Art Visual Desktop"
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

        {/* Monumental Typography Overlay (Always 100% visible, perfectly proportioned) */}
        <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-5 sm:px-10 md:px-14 pt-8 sm:pt-12 md:pt-16 pb-24 sm:pb-28 md:pb-24 flex flex-col justify-between opacity-100">
          {/* Top Brand & Location Stamp */}
          <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neutral-300">
            <span className="font-semibold text-white tracking-widest">CYRUX STUDIO</span>
            <span className="text-neutral-400">
              {t({
                tr: "KUZEY KIBRIS • 35.1856° N",
                en: "NORTH CYPRUS • 35.1856° N",
              })}
            </span>
          </div>

          {/* Monumental Headline */}
          <div className="max-w-5xl">
            <h2 className="font-sans text-2xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight leading-[0.98] sm:leading-[0.94] text-white">
              <span className="block text-white">
                {t({ tr: "HAZIR MODA SEVMİYORUZ.", en: "WE REJECT FAST FASHION." })}
              </span>
              <span className="block text-white/55">
                {t({ tr: "GİYİLEBİLİR SANAT.", en: "WEARABLE ART." })}
              </span>
              <span className="block text-white">
                {t({ tr: "SİZİ YANSITAN PARÇALAR.", en: "SHAPED FOR YOUR ESSENCE." })}
              </span>
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
