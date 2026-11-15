"use client";

import React, { useState, useEffect } from "react";

export interface StoreSettingsFormProps {
  onCurrencyChange?: (currency: string) => void;
  onSaveSuccess?: () => void;
}

const CURRENCIES = ["USD", "EUR", "TRY", "GBP"] as const;

export function StoreSettingsForm({ onCurrencyChange, onSaveSuccess }: StoreSettingsFormProps) {
  const [whatsappNumber, setWhatsappNumber] = useState("+905320000000");
  const [currency, setCurrency] = useState<string>("USD");
  const [storeName, setStoreName] = useState("cyrux studio");
  const [brandBio, setBrandBio] = useState("wearable art & brutalist luxury");
  const [announcement, setAnnouncement] = useState("GLOBAL EXPRESS DISPATCH • CYPRUS • PARIS • TOKYO");
  const [instagram, setInstagram] = useState("https://instagram.com/cyruxstudio");
  const [twitter, setTwitter] = useState("https://x.com/cyruxstudio");

  // Dynamic Visual Slots (Desktop & Mobile)
  const [heroDesktopImage, setHeroDesktopImage] = useState("/assets/editorial/hero-desktop.jpg");
  const [heroMobileImage, setHeroMobileImage] = useState("/assets/editorial/hero-mobile.jpg");
  const [aboutDesktopImage, setAboutDesktopImage] = useState("/assets/editorial/about-desktop.jpg");
  const [aboutMobileImage, setAboutMobileImage] = useState("/assets/editorial/about-mobile.jpg");
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing settings
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/settings");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.settings) {
          const s = data.settings;
          if (s.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
          if (s.currency) {
            setCurrency(s.currency);
            if (onCurrencyChange) onCurrencyChange(s.currency);
          }
          if (s.storeName) setStoreName(s.storeName);
          if (s.brandBio) setBrandBio(s.brandBio);
          if (typeof s.announcement === "string") {
            setAnnouncement(s.announcement);
          } else if (typeof s.brandMetadata?.announcement === "string") {
            setAnnouncement(s.brandMetadata.announcement);
          }
          if (s.socialLinks?.instagram) setInstagram(s.socialLinks.instagram);
          if (s.socialLinks?.twitter) setTwitter(s.socialLinks.twitter);
          if (s.heroDesktopImage || s.brandMetadata?.heroDesktopImage) {
            setHeroDesktopImage(s.heroDesktopImage || s.brandMetadata.heroDesktopImage);
          }
          if (s.heroMobileImage || s.brandMetadata?.heroMobileImage) {
            setHeroMobileImage(s.heroMobileImage || s.brandMetadata.heroMobileImage);
          }
          if (s.aboutDesktopImage || s.brandMetadata?.aboutDesktopImage) {
            setAboutDesktopImage(s.aboutDesktopImage || s.brandMetadata.aboutDesktopImage);
          }
          if (s.aboutMobileImage || s.brandMetadata?.aboutMobileImage) {
            setAboutMobileImage(s.aboutMobileImage || s.brandMetadata.aboutMobileImage);
          }
          if (s.updatedAt) {
            setSyncTimestamp(new Date(s.updatedAt).toLocaleTimeString());
          }
        }
      } catch {
        setError("Failed to load store settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [onCurrencyChange]);

  const handlePhoneChange = (val: string) => {
    // Keep + and digits
    const cleaned = val.replace(/[^\d+]/g, "");
    setWhatsappNumber(cleaned);
  };

  const handleCurrencySelect = (c: string) => {
    setCurrency(c);
    if (onCurrencyChange) onCurrencyChange(c);
  };

  const handleUploadImage = async (
    slot: "heroDesktop" | "heroMobile" | "aboutDesktop" | "aboutMobile",
    file: File
  ) => {
    try {
      setUploadingSlot(slot);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/blob/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Görsel yüklenemedi");
      }
      if (slot === "heroDesktop") setHeroDesktopImage(data.url);
      if (slot === "heroMobile") setHeroMobileImage(data.url);
      if (slot === "aboutDesktop") setAboutDesktopImage(data.url);
      if (slot === "aboutMobile") setAboutMobileImage(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber,
          currency,
          storeName,
          brandBio,
          announcement,
          socialLinks: {
            instagram,
            twitter,
          },
          heroDesktopImage,
          heroMobileImage,
          aboutDesktopImage,
          aboutMobileImage,
          brandMetadata: {
            announcement,
            heroDesktopImage,
            heroMobileImage,
            aboutDesktopImage,
            aboutMobileImage,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to persist configuration");
      }

      setSyncTimestamp(new Date().toLocaleTimeString());
      setSaveSuccess("[SUCCESS] Store configuration and editorial assets successfully persisted.");
      setTimeout(() => setSaveSuccess(null), 4000);
      if (onCurrencyChange) onCurrencyChange(currency);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save error";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Live order preview computation
  const isPhoneValid = /^\+\d{10,15}$/.test(whatsappNumber.replace(/[\s()-]/g, ""));
  const sampleOrderPhone = whatsappNumber.replace(/\D/g, "");
  const sampleOrderLines = [
    "*NEW ORDER - CYRUX STUDIO*",
    "Product: CYRUX SCULPTURAL JACKET",
    "Variant: M",
    `Price: 420.00 ${currency}`,
    "Notes: Fast delivery requested",
    "Ref ID: prod-1731596400",
  ].join("\n");
  const sampleOrderUrl = `https://wa.me/${sampleOrderPhone}?text=${encodeURIComponent(sampleOrderLines)}`;

  if (loading) {
    return (
      <div className="py-16 text-center text-[#666666] font-mono text-xs tracking-widest uppercase">
        [ LOADING STORE SETTINGS ENGINE... ]
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 font-mono max-w-4xl pb-16 md:pb-0">
      {/* Status banner */}
      <div className="bg-[#121212] border border-[#222222] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[#FAF8F3] font-bold uppercase tracking-wider text-[11px] sm:text-xs">
            STORE ENGINE • PERSISTENCE PIPELINE
          </span>
        </div>
        {syncTimestamp && (
          <span className="text-emerald-400 text-[10px] sm:text-[11px] uppercase tracking-wider">
            [SYNCHRONIZED AT {syncTimestamp}]
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/80 text-red-300 text-xs p-3 uppercase tracking-wider">
          [!] {error}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-500/80 text-emerald-300 text-xs p-3 uppercase tracking-wider font-bold">
          {saveSuccess}
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-5 sm:gap-6">
        {/* Section 1: WhatsApp Configuration */}
        <div className="bg-[#121212] border border-[#222222] p-4 sm:p-6 flex flex-col gap-4">
          <div className="border-b border-[#222222] pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#FAF8F3] uppercase tracking-wider">
              [ 01. WHATSAPP ORDERING CHANNEL ]
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#777777] uppercase tracking-wider mt-0.5">
              TARGET DESTINATION PHONE FOR WA.ME REDIRECTION & AUTOMATED ORDER DISPATCH
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] sm:text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
              TARGET PHONE NUMBER (E.164 FORMAT WITH COUNTRY CODE)
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+905320000000"
              required
              className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-sm px-4 py-3 rounded-none outline-none font-mono min-h-[44px]"
            />
            {!isPhoneValid && (
              <span className="text-[11px] sm:text-xs text-amber-400 tracking-wider">
                [!] Warning: Number must start with + and country code (10-15 digits total)
              </span>
            )}
          </div>

          {/* Live Order Preview Card */}
          <div className="mt-2 bg-[#0A0A0A] border border-[#262626] p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-[#888888] uppercase">
              <span>LIVE WHATSAPP ORDER PAYLOAD PREVIEW</span>
              <a
                href={sampleOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FAF8F3] hover:underline"
              >
                [TEST WHATSAPP LINK ↗]
              </a>
            </div>
            <pre className="text-[11px] sm:text-xs text-emerald-400/90 whitespace-pre font-mono p-3 bg-[#111111] border border-[#1A1A1A] overflow-x-auto">
              {sampleOrderLines}
            </pre>
          </div>
        </div>

        {/* Section 2: Store Currency */}
        <div className="bg-[#121212] border border-[#222222] p-4 sm:p-6 flex flex-col gap-4">
          <div className="border-b border-[#222222] pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#FAF8F3] uppercase tracking-wider">
              [ 02. STORE CURRENCY SELECTOR ]
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#777777] uppercase tracking-wider mt-0.5">
              GLOBAL DISPLAY CURRENCY FOR ALL PUBLIC CATALOG PRICES AND WHATSAPP ORDERS
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCurrencySelect(c)}
                className={`min-h-[48px] py-3 px-4 text-xs font-bold uppercase tracking-wider border rounded-none transition-none cursor-pointer flex items-center justify-center ${
                  currency === c
                    ? "bg-[#FAF8F3] text-[#0A0A0A] border-[#FAF8F3]"
                    : "bg-[#0A0A0A] text-[#888888] border-[#2E2E2E] hover:border-[#666666] hover:text-[#FAF8F3] active:bg-[#1A1A1A]"
                }`}
              >
                [{c} ({c === "EUR" ? "€" : c === "TRY" ? "₺" : c === "GBP" ? "£" : "$"})]
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Brand Metadata */}
        <div className="bg-[#121212] border border-[#222222] p-4 sm:p-6 flex flex-col gap-4">
          <div className="border-b border-[#222222] pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#FAF8F3] uppercase tracking-wider">
              [ 03. BRAND IDENTITY & EDITORIAL COPY ]
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#777777] uppercase tracking-wider mt-0.5">
              STOREFRONT TITLES, EDITORIAL NARRATIVE, AND SOCIAL CHANNELS
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] sm:text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                STORE NAME
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-sm px-3.5 py-3 rounded-none outline-none font-mono min-h-[44px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] sm:text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                  ANNOUNCEMENT BANNER TEXT
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">[LIVE TICKER PREVIEW]</span>
              </div>
              <input
                type="text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-sm px-3.5 py-3 rounded-none outline-none font-mono min-h-[44px]"
              />
              <div className="bg-[#050505] border border-[#222222] px-3 py-1.5 overflow-hidden flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-[#555555] uppercase font-bold shrink-0">STOREFRONT:</span>
                <span className="text-[10px] text-amber-300 font-mono tracking-widest truncate uppercase">
                  {announcement || "GLOBAL EXPRESS DISPATCH • CYPRUS • PARIS • TOKYO"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] sm:text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
              BRAND TAGLINE / BIO
            </label>
            <textarea
              rows={2}
              value={brandBio}
              onChange={(e) => setBrandBio(e.target.value)}
              className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-sm px-3.5 py-2.5 rounded-none outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] sm:text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                INSTAGRAM URL
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-sm px-3.5 py-3 rounded-none outline-none font-mono min-h-[44px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] sm:text-xs uppercase text-[#AAAAAA] font-bold tracking-wider">
                TWITTER / X URL
              </label>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-sm px-3.5 py-3 rounded-none outline-none font-mono min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Dynamic Hero & About Editorial Visuals (Mobile & PC) */}
        <div className="bg-[#121212] border border-[#222222] p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
          <div className="border-b border-[#222222] pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#FAF8F3] uppercase tracking-wider">
              [ 04. DİNAMİK HERO & HAKKINDA GÖRSELLERİ (MOBİL & PC) ]
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#777777] uppercase tracking-wider mt-0.5">
              HERO VE HAKKIMIZDA BÖLÜMÜ İÇİN AYRI AYRI MASAÜSTÜ (16:9) VE MOBİL (DİKEY PORTRE) GÖRSEL YÖNETİMİ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Slot 1: Hero Desktop */}
            <div className="bg-[#0A0A0A] border border-[#262626] p-3.5 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#FAF8F3] uppercase">
                <span>[ HERO • PC / MASAÜSTÜ ]</span>
                <span className="text-[10px] text-emerald-400 font-mono">[16:9 WIDESCREEN]</span>
              </div>
              <div className="relative w-full h-36 bg-[#161616] border border-[#2E2E2E] overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroDesktopImage}
                  alt="Hero Desktop Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#888888] uppercase font-bold">GÖRSEL URL</label>
                <input
                  type="text"
                  value={heroDesktopImage}
                  onChange={(e) => setHeroDesktopImage(e.target.value)}
                  className="bg-[#111111] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3 py-2.5 rounded-none outline-none font-mono min-h-[44px]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="min-h-[44px] flex-1 cursor-pointer text-center flex items-center justify-center py-2 px-3 bg-[#1A1A1A] hover:bg-[#282828] active:bg-[#333333] text-[#FAF8F3] border border-[#333333] text-[11px] uppercase font-bold tracking-wider">
                  {uploadingSlot === "heroDesktop" ? "[ YÜKLENİYOR... ]" : "[ YENİ FOTOĞRAF YÜKLE ↑ ]"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingSlot === "heroDesktop"}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadImage("heroDesktop", f);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setHeroDesktopImage("/assets/editorial/hero-desktop.jpg")}
                  className="min-h-[44px] py-2 px-3 bg-transparent hover:bg-[#1A1A1A] active:bg-[#222222] text-[#888888] hover:text-[#FAF8F3] border border-[#2E2E2E] text-[10px] uppercase font-bold tracking-wider"
                >
                  [SIFIRLA]
                </button>
              </div>
            </div>

            {/* Slot 2: Hero Mobile */}
            <div className="bg-[#0A0A0A] border border-[#262626] p-3.5 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#FAF8F3] uppercase">
                <span>[ HERO • MOBİL ]</span>
                <span className="text-[10px] text-amber-400 font-mono">[3:4 DİKEY PORTRE]</span>
              </div>
              <div className="relative w-full h-36 bg-[#161616] border border-[#2E2E2E] overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroMobileImage}
                  alt="Hero Mobile Preview"
                  className="h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#888888] uppercase font-bold">GÖRSEL URL</label>
                <input
                  type="text"
                  value={heroMobileImage}
                  onChange={(e) => setHeroMobileImage(e.target.value)}
                  className="bg-[#111111] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3 py-2.5 rounded-none outline-none font-mono min-h-[44px]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="min-h-[44px] flex-1 cursor-pointer text-center flex items-center justify-center py-2 px-3 bg-[#1A1A1A] hover:bg-[#282828] active:bg-[#333333] text-[#FAF8F3] border border-[#333333] text-[11px] uppercase font-bold tracking-wider">
                  {uploadingSlot === "heroMobile" ? "[ YÜKLENİYOR... ]" : "[ YENİ FOTOĞRAF YÜKLE ↑ ]"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingSlot === "heroMobile"}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadImage("heroMobile", f);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setHeroMobileImage("/assets/editorial/hero-mobile.jpg")}
                  className="min-h-[44px] py-2 px-3 bg-transparent hover:bg-[#1A1A1A] active:bg-[#222222] text-[#888888] hover:text-[#FAF8F3] border border-[#2E2E2E] text-[10px] uppercase font-bold tracking-wider"
                >
                  [SIFIRLA]
                </button>
              </div>
            </div>

            {/* Slot 3: About Desktop */}
            <div className="bg-[#0A0A0A] border border-[#262626] p-3.5 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#FAF8F3] uppercase">
                <span>[ HAKKINDA • PC / MASAÜSTÜ ]</span>
                <span className="text-[10px] text-emerald-400 font-mono">[16:9 WIDESCREEN]</span>
              </div>
              <div className="relative w-full h-36 bg-[#161616] border border-[#2E2E2E] overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutDesktopImage}
                  alt="About Desktop Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#888888] uppercase font-bold">GÖRSEL URL</label>
                <input
                  type="text"
                  value={aboutDesktopImage}
                  onChange={(e) => setAboutDesktopImage(e.target.value)}
                  className="bg-[#111111] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3 py-2.5 rounded-none outline-none font-mono min-h-[44px]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="min-h-[44px] flex-1 cursor-pointer text-center flex items-center justify-center py-2 px-3 bg-[#1A1A1A] hover:bg-[#282828] active:bg-[#333333] text-[#FAF8F3] border border-[#333333] text-[11px] uppercase font-bold tracking-wider">
                  {uploadingSlot === "aboutDesktop" ? "[ YÜKLENİYOR... ]" : "[ YENİ FOTOĞRAF YÜKLE ↑ ]"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingSlot === "aboutDesktop"}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadImage("aboutDesktop", f);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setAboutDesktopImage("/assets/editorial/about-desktop.jpg")}
                  className="min-h-[44px] py-2 px-3 bg-transparent hover:bg-[#1A1A1A] active:bg-[#222222] text-[#888888] hover:text-[#FAF8F3] border border-[#2E2E2E] text-[10px] uppercase font-bold tracking-wider"
                >
                  [SIFIRLA]
                </button>
              </div>
            </div>

            {/* Slot 4: About Mobile */}
            <div className="bg-[#0A0A0A] border border-[#262626] p-3.5 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#FAF8F3] uppercase">
                <span>[ HAKKINDA • MOBİL ]</span>
                <span className="text-[10px] text-amber-400 font-mono">[3:4 DİKEY PORTRE]</span>
              </div>
              <div className="relative w-full h-36 bg-[#161616] border border-[#2E2E2E] overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutMobileImage}
                  alt="About Mobile Preview"
                  className="h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#888888] uppercase font-bold">GÖRSEL URL</label>
                <input
                  type="text"
                  value={aboutMobileImage}
                  onChange={(e) => setAboutMobileImage(e.target.value)}
                  className="bg-[#111111] border border-[#2E2E2E] focus:border-[#FAF8F3] text-[#FAF8F3] text-base md:text-xs px-3 py-2.5 rounded-none outline-none font-mono min-h-[44px]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="min-h-[44px] flex-1 cursor-pointer text-center flex items-center justify-center py-2 px-3 bg-[#1A1A1A] hover:bg-[#282828] active:bg-[#333333] text-[#FAF8F3] border border-[#333333] text-[11px] uppercase font-bold tracking-wider">
                  {uploadingSlot === "aboutMobile" ? "[ YÜKLENİYOR... ]" : "[ YENİ FOTOĞRAF YÜKLE ↑ ]"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingSlot === "aboutMobile"}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadImage("aboutMobile", f);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setAboutMobileImage("/assets/editorial/about-mobile.jpg")}
                  className="min-h-[44px] py-2 px-3 bg-transparent hover:bg-[#1A1A1A] active:bg-[#222222] text-[#888888] hover:text-[#FAF8F3] border border-[#2E2E2E] text-[10px] uppercase font-bold tracking-wider"
                >
                  [SIFIRLA]
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Action Bar / Desktop Inline */}
        <div className="fixed md:static bottom-0 inset-x-0 p-3 sm:p-4 bg-[#0A0A0A]/95 backdrop-blur-md md:bg-transparent border-t border-[#222222] md:border-0 z-30 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#FAF8F3] text-[#0A0A0A] hover:bg-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-transform shadow-2xl md:shadow-none"
          >
            {saving ? "[ PERSISTING TO DATABASE... ]" : "[ PERSIST CONFIGURATION → ]"}
          </button>
        </div>
      </form>
    </div>
  );
}
