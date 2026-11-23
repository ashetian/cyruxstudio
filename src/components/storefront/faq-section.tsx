"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { DEFAULT_STOREFRONT_CMS, type FaqCmsData } from "@/lib/cms";

export interface FaqSectionProps {
  faqCms?: FaqCmsData | null;
  cms?: FaqCmsData | null;
  className?: string;
}

export function FaqSection({ faqCms, cms, className = "" }: FaqSectionProps) {
  const { t } = useLanguage();
  const data = faqCms ?? cms ?? DEFAULT_STOREFRONT_CMS.faq;
  const items = data.items || [];
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  if (data.enabled === false || items.length === 0) {
    return null;
  }

  return (
    <section
      id="faq"
      aria-label="Frequently Asked Questions"
      className={cn(
        "w-full max-w-5xl mx-auto px-4 md:px-12 py-16 md:py-24 border-t border-black/15",
        className
      )}
    >
      <div className="mb-10 space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 block">
          {t(data.eyebrow)}
        </span>
        <h2 className="font-mono text-2xl sm:text-4xl font-bold uppercase tracking-tight text-black">
          {t(data.title)}
        </h2>
        <p className="font-mono text-xs text-neutral-600 max-w-2xl">
          {t(data.subtitle)}
        </p>
      </div>

      <div className="divide-y divide-black/15 border-y border-black/15">
        {items.map((item, idx) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id || idx}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full min-h-[48px] py-4 px-2 flex items-center justify-between gap-4 text-left font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-black hover:bg-black/[0.03] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <span className="flex items-baseline gap-3">
                  <span className="text-neutral-400 text-[11px]">
                    [{String(idx + 1).padStart(2, "0")}]
                  </span>
                  <span>{t(item.question)}</span>
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="pb-5 pl-9 pr-4 font-mono text-xs leading-relaxed text-neutral-700">
                  {t(item.answer)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default FaqSection;
