"use client";

import React, { useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { ProductCatalogTable } from "@/components/admin/product-catalog-table";
import { StoreSettingsForm } from "@/components/admin/store-settings-form";
import { MediaAssetsGrid } from "@/components/admin/media-assets-grid";
import { DropManagement } from "@/components/admin/drop-management";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"products" | "settings" | "media" | "drops">("products");
  const [currency, setCurrency] = useState<string>("USD");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAF8F3] font-mono flex flex-col">
      {/* Header */}
      <AdminHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        adminEmail="admin@cyrux.studio"
      />

      {/* Main Content Surface */}
      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl w-full mx-auto">
        {activeTab === "products" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-xl font-bold uppercase tracking-tight text-[#FAF8F3]">
                [ 01. PRODUCT CATALOG & INVENTORY ]
              </h2>
              <p className="text-xs text-[#777777] uppercase tracking-wider">
                LIFECYCLE MANAGEMENT • PRICING, INVENTORY STEPPERS, VARIANTS & BESTSELLER PROMOTIONS
              </p>
            </div>
            <ProductCatalogTable currency={currency} />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-xl font-bold uppercase tracking-tight text-[#FAF8F3]">
                [ 02. STORE ARCHITECTURE & REDIRECTION ]
              </h2>
              <p className="text-xs text-[#777777] uppercase tracking-wider">
                WHATSAPP ORDERING PARAMETERS • E.164 VALIDATION, CURRENCY PROTOCOL & BRAND ESSENCE
              </p>
            </div>
            <StoreSettingsForm onCurrencyChange={setCurrency} />
          </div>
        )}

        {activeTab === "media" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-xl font-bold uppercase tracking-tight text-[#FAF8F3]">
                [ 03. VERCEL BLOB ASSET VAULT ]
              </h2>
              <p className="text-xs text-[#777777] uppercase tracking-wider">
                HIGH-AVAILABILITY CLOUD ASSET STORAGE • DRAG-AND-DROP INGESTION, MIME WHITELIST & EXPIRY CONTROLS
              </p>
            </div>
            <MediaAssetsGrid />
          </div>
        )}

        {activeTab === "drops" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 pb-2 border-b border-[#1E1E1E]">
              <h2 className="text-xl font-bold uppercase tracking-tight text-[#FAF8F3]">
                [ 04. ATELIER DROP SYSTEM & ARCHIVE ]
              </h2>
              <p className="text-xs text-[#777777] uppercase tracking-wider">
                DROP LIFECYCLE MANAGEMENT • ACTIVE / UPCOMING / ARCHIVED RELEASES, PIECE ALLOCATIONS & EDITIONS
              </p>
            </div>
            <DropManagement />
          </div>
        )}
      </main>

      {/* Persistent Technical Footnote */}
      <footer className="border-t border-[#1A1A1A] bg-[#0A0A0A] px-4 md:px-8 py-4 text-center text-[10px] text-[#444444] uppercase tracking-widest">
        CYRUX STUDIO MONOLITH • NEXT.JS 15 EDGE GUARD • VERCEL BLOB VAULT • HS256 SESSION ACTIVE
      </footer>
    </div>
  );
}
