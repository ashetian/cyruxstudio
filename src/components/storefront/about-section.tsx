"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/components/providers/language-provider";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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
  const prefersReducedMotion = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion || typeof window === "undefined" || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop (min-width: 768px): Widescreen aspect ~16:9 expands to full-screen 100vw x 100vh
      mm.add("(min-width: 768px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
          },
        });

        // 1. Frame expands from 16:9 box to fill entire screen (strictly sharp/unrounded)
        if (frameRef.current) {
          tl.fromTo(
            frameRef.current,
            {
              width: "74vw",
              height: "68vh",
            },
            {
              width: "100vw",
              height: "100vh",
              ease: "power2.inOut",
            },
            0
          );
        }

        // 2. Image inside zooms in smoothly
        if (imageRef.current) {
          tl.fromTo(
            imageRef.current,
            { scale: 1 },
            {
              scale: 1.25,
              ease: "none",
            },
            0
          );
        }

        // 3. Text overlay slides and fades in over image
        if (textRef.current) {
          tl.fromTo(
            textRef.current,
            {
              opacity: 0,
              y: 50,
            },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              duration: 0.6,
            },
            0.22
          );
        }
      });

      // Mobile (max-width: 767px): Vertical portrait aspect ~4:5 expands to full-screen 100vw x 100svh
      mm.add("(max-width: 767px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
          },
        });

        // 1. Frame expands from portrait box to fill entire mobile screen (strictly sharp/unrounded)
        if (frameRef.current) {
          tl.fromTo(
            frameRef.current,
            {
              width: "88vw",
              height: "68svh",
            },
            {
              width: "100vw",
              height: "100svh",
              ease: "power2.inOut",
            },
            0
          );
        }

        // 2. Image inside zooms in smoothly
        if (imageRef.current) {
          tl.fromTo(
            imageRef.current,
            { scale: 1 },
            {
              scale: 1.25,
              ease: "none",
            },
            0
          );
        }

        // 3. Text overlay slides and fades in over image
        if (textRef.current) {
          tl.fromTo(
            textRef.current,
            {
              opacity: 0,
              y: 35,
            },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              duration: 0.6,
            },
            0.22
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-label="About Cyrux Studio"
      className="relative w-full h-[220vh] bg-black select-none"
    >
      {/* Pinned Sticky Viewport Window */}
      <div className="sticky top-0 w-full h-screen h-[100svh] overflow-hidden flex items-center justify-center bg-black">
        {/*
          Expanding Visual Container:
          - Starts framed in natural aspect ratio (portrait on mobile, widescreen on desktop)
          - Borderless, zero frames
          - Grows on scroll to fill 100% of the screen
        */}
        <div
          ref={frameRef}
          className={`relative overflow-hidden shadow-2xl rounded-none will-change-[width,height] ${
            prefersReducedMotion
              ? "w-full h-full"
              : "w-[88vw] h-[68svh] md:w-[74vw] md:h-[68vh]"
          }`}
        >
          {/* Zooming Image Layer (Dynamic Desktop & Mobile) */}
          <div
            ref={imageRef}
            className="absolute inset-0 w-full h-full will-change-transform"
          >
            {/* Mobile View: Vertical Portrait */}
            <div className="block md:hidden absolute inset-0 w-full h-full">
              <Image
                src={mobileImageSrc || imageSrc}
                alt="Cyrux Studio Wearable Art Visual Mobile"
                fill
                loading="lazy"
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
                loading="lazy"
                unoptimized
                quality={100}
                sizes="100vw"
                className="object-cover object-center brightness-[0.78] contrast-[1.14]"
              />
            </div>
          </div>

          {/* Cinematic Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25 pointer-events-none" />

          {/* Minimal Monumental Typography Overlay */}
          <div
            ref={textRef}
            className={`relative z-10 w-full h-full max-w-7xl mx-auto px-5 sm:px-10 md:px-14 pt-6 sm:pt-10 md:pt-14 pb-28 sm:pb-32 md:pb-20 flex flex-col justify-between ${
              prefersReducedMotion ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {/* Top Brand & Location Stamp */}
            <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs uppercase tracking-widest text-neutral-300">
              <span className="font-semibold text-white">CYRUX STUDIO</span>
              <span>
                {t({
                  tr: "KIBRIS • 35.1856° N",
                  en: "CYPRUS • 35.1856° N",
                })}
              </span>
            </div>

            {/* Monumental Headline */}
            <div className="max-w-5xl">
              <h2 className="font-sans text-2xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.92] sm:leading-[0.9] text-white">
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
      </div>
    </section>
  );
}

export default AboutSection;
