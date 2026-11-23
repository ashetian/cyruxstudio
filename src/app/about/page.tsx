import React from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { getStorefrontCms } from "@/lib/cms";
import { AboutSection } from "@/components/storefront/about-section";
import { StudioFooter } from "@/components/storefront/studio-footer";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [cms, settings] = await Promise.all([
    getStorefrontCms(),
    prisma.storeSettings.findFirst(),
  ]);

  const whatsappNumber =
    settings?.whatsappNumber || cms.contact.whatsappNumber || "+905551234567";

  return (
    <main className="min-h-screen bg-black text-[#FAF8F3] flex flex-col justify-between">
      <div>
        <header className="w-full max-w-7xl mx-auto px-4 md:px-12 py-4 flex items-center justify-between border-b border-white/15">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center font-mono text-xs font-bold uppercase tracking-widest text-[#FAF8F3] hover:opacity-75 cursor-pointer"
          >
            ← CYRUX STUDIO
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            ATELIER MANIFESTO
          </span>
        </header>
        <AboutSection aboutCms={cms.about} />
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
