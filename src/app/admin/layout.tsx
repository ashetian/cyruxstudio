import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "CYRUX STUDIO — ATELIER ADMIN",
  description: "Atelier catalog, orders, and storefront management for Cyrux Studio.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#0A0A0A] font-sans overflow-x-hidden selection:bg-black selection:text-[#FAF8F3]">
      {children}
    </div>
  );
}
