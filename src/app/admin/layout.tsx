import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "CYRUX STUDIO — ADMIN CONSOLE",
  description: "Restricted administrative terminal for cyrux studio operations.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAF8F3] font-mono selection:bg-[#FAF8F3] selection:text-[#0A0A0A]">
      {children}
    </div>
  );
}
