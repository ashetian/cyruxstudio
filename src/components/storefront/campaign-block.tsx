"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { DEFAULT_STOREFRONT_CMS, type LookbookCmsData } from "@/lib/cms";

export interface ResolveVideoPosterResult {
  hasVideo: boolean;
  poster: string;
  source?: string;
}

/**
 * Pure helper function matching contract in tests/tier1-feature/f08-campaign-block.ts (8.5)
 */
export function resolveVideoPoster(
  videoUrl: string | null | undefined,
  fallbackPoster: string
): ResolveVideoPosterResult {
  if (!videoUrl || videoUrl.trim() === "") {
    return { hasVideo: false, poster: fallbackPoster };
  }
  return { hasVideo: true, source: videoUrl, poster: fallbackPoster };
}

export interface CampaignBlockProps {
  videoUrl?: string | null;
  posterUrl?: string;
  portraitUrl?: string;
  objectUrl?: string;
  lookbook?: LookbookCmsData | null;
  cms?: LookbookCmsData | null;
  className?: string;
}

export function CampaignBlock({
  videoUrl,
  posterUrl,
  portraitUrl,
  objectUrl,
  lookbook,
  cms,
  className = "",
}: CampaignBlockProps) {
  const { t } = useLanguage();
  const resolvedLookbook = lookbook ?? cms ?? DEFAULT_STOREFRONT_CMS.lookbook;

  const resolvedVideoUrl =
    videoUrl !== undefined
      ? videoUrl
      : resolvedLookbook.videoUrl || "/assets/video/cyrux-campaign-1080.mp4";
  const resolvedPosterUrl =
    posterUrl ||
    resolvedLookbook.posterUrl ||
    "/assets/video/cyrux-campaign-poster.webp";
  const resolvedPortraitUrl =
    portraitUrl ||
    resolvedLookbook.card1?.imageUrl ||
    "/assets/campaign/campaign-card-puffer.webp";
  const resolvedObjectUrl =
    objectUrl ||
    resolvedLookbook.card2?.imageUrl ||
    "/assets/campaign/campaign-card-chrome-shoe.webp";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const videoMeta = resolveVideoPoster(resolvedVideoUrl, resolvedPosterUrl);

  const togglePlayback = useCallback(() => {
    if (!videoRef.current || !videoMeta.hasVideo) return;

    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [videoMeta.hasVideo]);

  const toggleAudio = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  if (resolvedLookbook.enabled === false) {
    return null;
  }

  return (
    <section
      id="new-collection"
      aria-label="Editorial Campaign"
      className={`w-full max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 scroll-mt-12 ${className}`}
    >
      {/* Editorial Section Label */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-black/20 pb-3 sm:pb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-brand-black font-bold">
          {t(resolvedLookbook.eyebrow)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted">
          {t(resolvedLookbook.subtitle)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8 items-stretch">
        {/* Left Column: 2 Cards */}
        <div className="lg:col-span-5 grid grid-cols-2 lg:flex lg:flex-col gap-3 sm:gap-6 md:gap-8 justify-between">
          {/* Card 1 */}
          <article
            data-cursor="VIEW"
            className="group relative aspect-square w-full overflow-hidden bg-[#FAF8F3] border border-black/10 select-none cursor-pointer"
          >
            <div className="absolute inset-0 z-0">
              <Image
                src={resolvedPortraitUrl}
                alt={t(resolvedLookbook.card1?.alt || DEFAULT_STOREFRONT_CMS.lookbook.card1.alt)}
                fill
                sizes="(max-width: 1024px) 50vw, 40vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                priority
              />
            </div>
            <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-10 font-mono text-[9px] sm:text-[10px] tracking-widest uppercase bg-black/80 text-white px-2 py-0.5">
              {t(resolvedLookbook.card1?.badge || DEFAULT_STOREFRONT_CMS.lookbook.card1.badge)}
            </div>
          </article>

          {/* Card 2 */}
          <article
            data-cursor="VIEW"
            className="group relative aspect-square w-full overflow-hidden bg-[#0A1128] border border-black/10 select-none cursor-pointer"
          >
            <div className="absolute inset-0 z-0">
              <Image
                src={resolvedObjectUrl}
                alt={t(resolvedLookbook.card2?.alt || DEFAULT_STOREFRONT_CMS.lookbook.card2.alt)}
                fill
                sizes="(max-width: 1024px) 50vw, 40vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
            <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-10 font-mono text-[9px] sm:text-[10px] tracking-widest uppercase bg-black/80 text-white px-2 py-0.5">
              {t(resolvedLookbook.card2?.badge || DEFAULT_STOREFRONT_CMS.lookbook.card2.badge)}
            </div>
          </article>
        </div>

        {/* Right Column: 1 Large Editorial Video Block */}
        <div
          data-cursor={isPlaying ? "PAUSE" : "PLAY"}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={togglePlayback}
          className="lg:col-span-7 relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto w-full min-h-[340px] sm:min-h-[420px] md:min-h-[500px] overflow-hidden bg-black border border-black/10 cursor-pointer group select-none"
        >
          {videoMeta.hasVideo ? (
            <video
              ref={videoRef}
              src={videoMeta.source}
              poster={videoMeta.poster}
              playsInline
              loop
              muted={isMuted}
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover select-none"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full relative">
              <Image
                src={videoMeta.poster}
                alt="Campaign fallback poster"
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
          )}

          {/* Film Header */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-white/80" />
            <span className="font-mono text-[11px] tracking-widest uppercase text-white/90 bg-black/40 px-2 py-0.5 backdrop-blur-sm">
              {t(resolvedLookbook.videoBadge)}
            </span>
          </div>

          {/* Centered Circular Play/Pause Button Overlay */}
          <button
            type="button"
            aria-label="Toggle Campaign Video Playback"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayback();
            }}
            className={`absolute inset-0 m-auto w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 text-black backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-20 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-white ${
              isPlaying && !isHovered ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black text-black" />
            ) : (
              <Play className="w-8 h-8 fill-black text-black ml-1" />
            )}
          </button>

          {/* Bottom Controls Bar: Audio Mute Toggle */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3">
            <button
              type="button"
              aria-label={isMuted ? "Unmute campaign audio" : "Mute campaign audio"}
              onClick={toggleAudio}
              className="min-w-[44px] min-h-[44px] rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md flex items-center justify-center transition-colors border border-white/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CampaignBlock;
