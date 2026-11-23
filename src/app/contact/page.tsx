import React from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { getStorefrontCms } from "@/lib/cms";
import { ContactSection } from "@/components/storefront/contact-section";
import { StudioFooter } from "@/components/storefront/studio-footer";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [cms, settings] = await Promise.all([
    getStorefrontCms(),
    prisma.storeSettings.findFirst(),
  ]);

  const whatsappNumber =
    settings?.whatsappNumber || cms.contact.whatsappNumber || "+905551234567";

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#0A0A0A] flex flex-col justify-between">
      <div>
        <header className="w-full max-w-7xl mx-auto px-4 md:px-12 pt-8 pb-4 flex items-center justify-between border-b border-black/15">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center font-mono text-xs font-bold uppercase tracking-widest hover:opacity-70 cursor-pointer"
          >
            ← CYRUX STUDIO
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            CONCIERGE & ATELIER
          </span>
        </header>
        <ContactSection
          contactCms={{ ...cms.contact, enabled: true }}
          whatsappNumber={whatsappNumber}
        />
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
