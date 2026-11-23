"use client";

import React from "react";
import { ArrowUpRight, Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { DEFAULT_STOREFRONT_CMS, type ContactCmsData } from "@/lib/cms";

export interface ContactSectionProps {
  contactCms?: ContactCmsData | null;
  cms?: ContactCmsData | null;
  whatsappNumber?: string;
  className?: string;
}

export function ContactSection({
  contactCms,
  cms,
  whatsappNumber,
  className = "",
}: ContactSectionProps) {
  const { t } = useLanguage();
  const data = contactCms ?? cms ?? DEFAULT_STOREFRONT_CMS.contact;

  if (data.enabled === false) {
    return null;
  }

  const email = data.supportEmail || "atelier@cyruxstudio.com";
  const rawPhone = whatsappNumber || data.whatsappNumber || "+905551234567";
  const waHref = `https://wa.me/${rawPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
    t(data.whatsappDefaultMessage)
  )}`;

  return (
    <section
      id="contact"
      aria-label="Contact Cyrux Studio"
      className={cn(
        "w-full max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 border-t border-black/15",
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WhatsApp Concierge */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group min-h-[44px] p-5 border border-black/15 bg-white hover:border-black transition-colors flex flex-col justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <div className="flex items-center justify-between text-neutral-500">
            <MessageSquare className="w-4 h-4 text-black" />
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block">
              WHATSAPP CONCIERGE
            </span>
            <span className="font-mono text-xs font-bold text-black mt-1 block">
              {data.whatsappFormatted || rawPhone}
            </span>
          </div>
        </a>

        {/* Email */}
        <a
          href={`mailto:${email}`}
          className="group min-h-[44px] p-5 border border-black/15 bg-white hover:border-black transition-colors flex flex-col justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <div className="flex items-center justify-between text-neutral-500">
            <Mail className="w-4 h-4 text-black" />
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block">
              {t({ tr: "E-POSTA", en: "EMAIL" })}
            </span>
            <span className="font-mono text-xs font-bold text-black mt-1 block truncate">
              {email}
            </span>
          </div>
        </a>

        {/* Address */}
        <div className="p-5 border border-black/15 bg-white flex flex-col justify-between gap-4">
          <MapPin className="w-4 h-4 text-black" />
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block">
              {t({ tr: "ATÖLYE ADRESİ", en: "ATELIER LOCATION" })}
            </span>
            <span className="font-mono text-xs font-bold text-black mt-1 block">
              {t(data.atelierAddress)}
            </span>
          </div>
        </div>

        {/* Working Hours */}
        <div className="p-5 border border-black/15 bg-white flex flex-col justify-between gap-4">
          <Clock className="w-4 h-4 text-black" />
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block">
              {t({ tr: "ÇALIŞMA SAATLERİ", en: "WORKING HOURS" })}
            </span>
            <span className="font-mono text-xs font-bold text-black mt-1 block">
              {t(data.workingHours)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
