"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import {
  DEFAULT_STOREFRONT_CMS,
  type MarqueeCmsData,
  type MarqueeItemCms,
} from "@/lib/cms";

export interface MarqueeBarProps {
  marquee?: (MarqueeCmsData & { visible?: boolean }) | null;
  visible?: boolean;
  items?: MarqueeItemCms[];
  speedSeconds?: number;
  pauseOnHover?: boolean;
  className?: string;
}

export function MarqueeBar({
  marquee,
  visible,
  items,
  speedSeconds,
  pauseOnHover,
  className = "",
}: MarqueeBarProps) {
  const { t } = useLanguage();

  const resolvedMarquee: MarqueeCmsData & { visible?: boolean } =
    marquee ?? DEFAULT_STOREFRONT_CMS.marquee;
  const isVisible =
    visible ?? resolvedMarquee.visible ?? resolvedMarquee.enabled ?? true;
  const resolvedItems =
    items && items.length > 0
      ? items
      : resolvedMarquee.items?.length
      ? resolvedMarquee.items
      : DEFAULT_STOREFRONT_CMS.marquee.items;

  if (!isVisible || resolvedItems.length === 0) {
    return null;
  }

  const duration = Math.min(
    120,
    Math.max(8, speedSeconds ?? resolvedMarquee.speedSeconds ?? 28)
  );
  const shouldPauseOnHover =
    pauseOnHover ?? resolvedMarquee.pauseOnHover ?? true;

  const renderGroup = (isDuplicate: boolean) => (
    <div
      className="flex items-center shrink-0"
      aria-hidden={isDuplicate ? "true" : undefined}
    >
      {resolvedItems.map((item, idx) => {
        const label = t(item.text);
        const href = item.href?.trim();
        const key = `${isDuplicate ? "dup" : "main"}-${item.id || idx}`;

        return (
          <React.Fragment key={key}>
            {href ? (
              href.startsWith("/") ? (
                <Link
                  href={href}
                  tabIndex={isDuplicate ? -1 : undefined}
                  className="min-h-[44px] inline-flex items-center px-4 sm:px-6 hover:opacity-75 transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF8F3]"
                >
                  <span>{label}</span>
                </Link>
              ) : (
                <a
                  href={href}
                  tabIndex={isDuplicate ? -1 : undefined}
                  className="min-h-[44px] inline-flex items-center px-4 sm:px-6 hover:opacity-75 transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF8F3]"
                >
                  <span>{label}</span>
                </a>
              )
            ) : (
              <span className="min-h-[44px] inline-flex items-center px-4 sm:px-6">
                {label}
              </span>
            )}
            <span aria-hidden="true" className="opacity-40 select-none">
              •
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <aside
      aria-label="Atelier Announcement Ticker"
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      className={cn(
        "w-full bg-[#0A0A0A] text-[#FAF8F3] border-y border-neutral-800 font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] overflow-hidden select-none",
        shouldPauseOnHover && "cyrux-marquee-pause",
        className
      )}
    >
      <div className="cyrux-marquee-track">
        {renderGroup(false)}
        {renderGroup(true)}
      </div>
    </aside>
  );
}

export default MarqueeBar;
