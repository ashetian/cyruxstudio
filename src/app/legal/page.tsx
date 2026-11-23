import React from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { getStorefrontCms } from "@/lib/cms";
import { StudioFooter } from "@/components/storefront/studio-footer";

export const dynamic = "force-dynamic";

export default async function LegalPage() {
  const [cms, settings] = await Promise.all([
    getStorefrontCms(),
    prisma.storeSettings.findFirst(),
  ]);

  const legal = cms.legal;
  const whatsappNumber =
    settings?.whatsappNumber || cms.contact.whatsappNumber || "+905551234567";

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#0A0A0A] flex flex-col justify-between font-mono">
      <div className="w-full max-w-5xl mx-auto px-4 md:px-12 py-10 space-y-10">
        <header className="flex items-center justify-between border-b border-black/15 pb-4">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center text-xs font-bold uppercase tracking-widest hover:opacity-70 cursor-pointer"
          >
            ← CYRUX STUDIO
          </Link>
          <span className="text-xs uppercase tracking-widest text-neutral-500">
            {legal.archiveTag || "CYRUX ARCHIVE"} • {legal.studioLocation}
          </span>
        </header>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight">
            {legal.modalTitle.tr} / {legal.modalTitle.en}
          </h1>
        </div>

        <div className="space-y-10">
          {legal.tabs.map((tab) => (
            <section
              key={tab.id}
              id={tab.id}
              className="border border-black/15 bg-white p-6 space-y-4"
            >
              <div className="border-b border-black/10 pb-3">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 block">
                  {tab.badge.tr}
                </span>
                <h2 className="text-lg font-bold uppercase tracking-wider mt-0.5">
                  {tab.label.tr} — {tab.label.en}
                </h2>
              </div>
              <div className="space-y-4">
                {tab.sections.map((sec) => (
                  <div key={sec.index} className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      [{sec.index}] {sec.title.tr}
                    </h3>
                    <p className="text-xs text-neutral-700 leading-relaxed font-sans">
                      {sec.body.tr}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <StudioFooter
        whatsappNumber={whatsappNumber}
        instagramUrl={cms.contact.socialLinks.instagram}
        footerCms={cms.footer}
        legalCms={cms.legal}
      />
    </main>
  );
}
