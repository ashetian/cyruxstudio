"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import type { FormattedStoreSettings } from "@/lib/settings";
import {
  ATELIER_BTN_PRIMARY,
  ATELIER_BTN_SECONDARY,
  ATELIER_INPUT_CLASS,
  ATELIER_LABEL_CLASS,
  ATELIER_TEXTAREA_CLASS,
  MediaField,
  ToggleRow,
} from "@/components/admin/cms/cms-field-primitives";

export interface StoreSettingsFormProps {
  onCurrencyChange?: (currency: string) => void;
  onSaveSuccess?: () => void;
  onSaved?: () => void;
}

const CURRENCIES = ["USD", "EUR", "TRY", "GBP"] as const;

const CURRENCY_SYMBOLS: Record<(typeof CURRENCIES)[number], string> = {
  USD: "$",
  EUR: "€",
  TRY: "₺",
  GBP: "£",
};

const STOREFRONT_THEMES: Array<{
  value: FormattedStoreSettings["activeTheme"];
  label: string;
  hint: string;
}> = [
  { value: "white-atelier", label: "White Atelier", hint: "Light bone & jet" },
  { value: "atelier", label: "Atelier", hint: "Editorial warm" },
  { value: "light", label: "Light", hint: "Clean white" },
  { value: "dark", label: "Dark", hint: "Obsidian contrast" },
];

export function StoreSettingsForm({
  onCurrencyChange,
  onSaveSuccess,
  onSaved,
}: StoreSettingsFormProps) {
  const phoneId = useId();
  const whatsappFormattedId = useId();
  const shippingFeeId = useId();
  const freeThresholdId = useId();
  const lowStockId = useId();
  const storeNameId = useId();
  const announcementId = useId();
  const brandBioId = useId();
  const supportEmailId = useId();
  const locationId = useId();
  const igLinkId = useId();
  const xLinkId = useId();
  const tiktokLinkId = useId();
  const igHandleId = useId();
  const xHandleId = useId();
  const tiktokHandleId = useId();

  const [whatsappNumber, setWhatsappNumber] = useState("+905338737712");
  const [whatsappFormatted, setWhatsappFormatted] = useState(
    "+90 (533) 873 77 12"
  );
  const [currency, setCurrency] = useState<string>("EUR");
  const [freeShippingThresholdInput, setFreeShippingThresholdInput] =
    useState<string>("");
  const [shippingFeeInput, setShippingFeeInput] = useState<string>("0");
  const [lowStockThresholdInput, setLowStockThresholdInput] =
    useState<string>("3");
  const [activeTheme, setActiveTheme] =
    useState<FormattedStoreSettings["activeTheme"]>("white-atelier");
  const [defaultLang, setDefaultLang] =
    useState<FormattedStoreSettings["defaultLang"]>("tr");
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);

  const [storeName, setStoreName] = useState("cyrux studio");
  const [brandBio, setBrandBio] = useState("wearable art & brutalist luxury");
  const [announcement, setAnnouncement] = useState("");
  const [supportEmail, setSupportEmail] = useState("contact@cyruxstudio.com");
  const [location, setLocation] = useState(
    "Kuzey Kıbrıs • Global Express Dispatch"
  );

  const [instagram, setInstagram] = useState("https://instagram.com/cyruxstudio");
  const [twitter, setTwitter] = useState("https://x.com/cyruxstudio");
  const [tiktok, setTiktok] = useState("https://tiktok.com/@cyruxstudio");
  const [instagramHandle, setInstagramHandle] = useState("@cyruxstudio");
  const [twitterHandle, setTwitterHandle] = useState("@cyruxstudio");
  const [tiktokHandle, setTiktokHandle] = useState("@cyruxstudio");

  const [heroDesktopImage, setHeroDesktopImage] = useState(
    "/assets/editorial/hero-desktop.jpg"
  );
  const [heroMobileImage, setHeroMobileImage] = useState(
    "/assets/editorial/hero-mobile.jpg"
  );
  const [aboutDesktopImage, setAboutDesktopImage] = useState(
    "/assets/editorial/about-desktop.jpg"
  );
  const [aboutMobileImage, setAboutMobileImage] = useState(
    "/assets/editorial/about-mobile.jpg"
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        settings?: FormattedStoreSettings;
        error?: string;
      };
      if (!res.ok || !data.success || !data.settings) {
        throw new Error(data.error || "Failed to load store settings");
      }

      const s = data.settings;
      if (s.whatsappNumber) setWhatsappNumber(s.whatsappNumber);
      if (s.whatsappFormatted !== undefined) {
        setWhatsappFormatted(s.whatsappFormatted);
      }
      if (s.currency) setCurrency(s.currency);

      setFreeShippingThresholdInput(
        s.freeShippingThreshold !== null &&
          s.freeShippingThreshold !== undefined
          ? String(s.freeShippingThreshold)
          : ""
      );
      setShippingFeeInput(
        typeof s.shippingFee === "number" ? String(s.shippingFee) : "0"
      );
      setLowStockThresholdInput(
        typeof s.lowStockThreshold === "number"
          ? String(s.lowStockThreshold)
          : "3"
      );

      if (s.activeTheme) setActiveTheme(s.activeTheme);
      if (s.defaultLang) setDefaultLang(s.defaultLang);
      if (typeof s.announcementEnabled === "boolean") {
        setAnnouncementEnabled(s.announcementEnabled);
      }

      if (s.storeName) setStoreName(s.storeName);
      if (s.brandBio) setBrandBio(s.brandBio);
      if (typeof s.announcement === "string") setAnnouncement(s.announcement);
      if (typeof s.supportEmail === "string") setSupportEmail(s.supportEmail);
      if (typeof s.location === "string") setLocation(s.location);

      if (s.socialLinks?.instagram !== undefined) {
        setInstagram(s.socialLinks.instagram);
      }
      if (s.socialLinks?.twitter !== undefined) {
        setTwitter(s.socialLinks.twitter);
      }
      if (s.socialLinks?.tiktok !== undefined) {
        setTiktok(s.socialLinks.tiktok);
      }

      if (s.socialHandles?.instagram !== undefined) {
        setInstagramHandle(s.socialHandles.instagram);
      }
      if (s.socialHandles?.twitter !== undefined) {
        setTwitterHandle(s.socialHandles.twitter);
      }
      if (s.socialHandles?.tiktok !== undefined) {
        setTiktokHandle(s.socialHandles.tiktok);
      }

      if (s.heroDesktopImage) setHeroDesktopImage(s.heroDesktopImage);
      if (s.heroMobileImage) setHeroMobileImage(s.heroMobileImage);
      if (s.aboutDesktopImage) setAboutDesktopImage(s.aboutDesktopImage);
      if (s.aboutMobileImage) setAboutMobileImage(s.aboutMobileImage);

      if (s.updatedAt) {
        setSyncTimestamp(new Date(s.updatedAt).toLocaleTimeString());
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load store settings"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/[^\d+]/g, "");
    setWhatsappNumber(cleaned);
  };

  const handleCurrencySelect = (c: string) => {
    setCurrency(c);
    onCurrencyChange?.(c);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || saving) return;
    setError(null);
    setSaveSuccess(null);

    const cleanedPhone = whatsappNumber.replace(/[\s()-]/g, "");
    if (!/^\+\d{10,15}$/.test(cleanedPhone)) {
      setError(
        "WhatsApp number must start with + and country code (10–15 digits)."
      );
      return;
    }

    const trimmedEmail = supportEmail.trim();
    if (
      trimmedEmail !== "" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      setError("Support email must be a valid email address.");
      return;
    }

    const socialEntries: Array<[string, string]> = [
      ["Instagram URL", instagram],
      ["Twitter / X URL", twitter],
      ["TikTok URL", tiktok],
    ];
    for (const [fieldLabel, rawUrl] of socialEntries) {
      const trimmedUrl = rawUrl.trim();
      if (trimmedUrl !== "" && !/^https?:\/\/\S+$/i.test(trimmedUrl)) {
        setError(`${fieldLabel} must be a valid http(s) URL.`);
        return;
      }
    }

    const parsedFreeThreshold =
      freeShippingThresholdInput.trim() === ""
        ? null
        : Number(freeShippingThresholdInput);
    if (
      parsedFreeThreshold !== null &&
      (!Number.isFinite(parsedFreeThreshold) || parsedFreeThreshold < 0)
    ) {
      setError("Free shipping threshold must be a non-negative number.");
      return;
    }

    const parsedShippingFee =
      shippingFeeInput.trim() === "" ? 0 : Number(shippingFeeInput);
    if (!Number.isFinite(parsedShippingFee) || parsedShippingFee < 0) {
      setError("Shipping fee must be 0 or greater.");
      return;
    }

    const parsedLowStock =
      lowStockThresholdInput.trim() === ""
        ? 3
        : Math.round(Number(lowStockThresholdInput));
    if (
      !Number.isFinite(parsedLowStock) ||
      parsedLowStock < 0 ||
      parsedLowStock > 1000
    ) {
      setError("Low stock threshold must be an integer between 0 and 1000.");
      return;
    }

    setSaving(true);

    try {
      const socialLinksPayload = {
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        tiktok: tiktok.trim(),
      };
      const socialHandlesPayload = {
        instagram: instagramHandle.trim(),
        twitter: twitterHandle.trim(),
        tiktok: tiktokHandle.trim(),
      };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber,
          whatsappFormatted,
          currency,
          freeShippingThreshold: parsedFreeThreshold,
          shippingFee: parsedShippingFee,
          lowStockThreshold: parsedLowStock,
          activeTheme,
          defaultLang,
          announcementEnabled,
          storeName,
          brandBio,
          announcement,
          supportEmail: supportEmail.trim(),
          location,
          socialLinks: socialLinksPayload,
          socialHandles: socialHandlesPayload,
          heroDesktopImage,
          heroMobileImage,
          aboutDesktopImage,
          aboutMobileImage,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        settings?: FormattedStoreSettings;
        error?: string;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save store settings");
      }

      setSyncTimestamp(new Date().toLocaleTimeString());
      setSaveSuccess("Store settings saved and published.");
      onCurrencyChange?.(currency);
      onSaveSuccess?.();
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const isPhoneValid = /^\+\d{10,15}$/.test(
    whatsappNumber.replace(/[\s()-]/g, "")
  );
  const sampleOrderPhone = whatsappNumber.replace(/\D/g, "");
  const sampleOrderLines = [
    "*NEW ORDER - CYRUX STUDIO*",
    "Product: CYRUX SCULPTURAL JACKET",
    "Variant: M",
    `Price: 420.00 ${currency}`,
    "Notes: Fast delivery requested",
    "Ref ID: prod-1731596400",
  ].join("\n");
  const sampleOrderUrl = `https://wa.me/${sampleOrderPhone}?text=${encodeURIComponent(
    sampleOrderLines
  )}`;

  return (
    <div className="flex flex-col gap-5 max-w-4xl w-full min-w-0 bg-[#FAF8F3] text-[#0A0A0A]">
      {/* Header status card */}
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <SlidersHorizontal className="w-5 h-5 shrink-0 text-[#0A0A0A]" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[#0A0A0A]">
              Global Store Settings
            </h2>
            <p className="text-xs text-[#525252]">
              {loading
                ? "Loading live store settings..."
                : syncTimestamp
                ? `Last synchronized at ${syncTimestamp}`
                : "Configure commerce rules, WhatsApp concierge, theme, and fallback visuals."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadSettings()}
          disabled={loading || saving}
          className={ATELIER_BTN_SECONDARY}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{loading ? "Syncing..." : "Reload"}</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSave} noValidate className="flex flex-col gap-5 min-w-0">
        {/* Section 1: WhatsApp Concierge */}
        <section className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4 min-w-0">
          <div className="border-b border-[#E8E4DC] pb-3">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
              01 • WhatsApp Ordering Channel
            </h3>
            <p className="text-xs text-[#525252] mt-1">
              Destination number for direct order dispatch and customer concierge links.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={phoneId} className={ATELIER_LABEL_CLASS}>
                WhatsApp Number (E.164 Format)
              </label>
              <input
                id={phoneId}
                type="tel"
                inputMode="tel"
                value={whatsappNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+905338737712"
                required
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
              {!isPhoneValid && (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1.5">
                  Number must start with + and country code (10–15 digits).
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label
                htmlFor={whatsappFormattedId}
                className={ATELIER_LABEL_CLASS}
              >
                Formatted Display Number
              </label>
              <input
                id={whatsappFormattedId}
                type="text"
                value={whatsappFormatted}
                onChange={(e) => setWhatsappFormatted(e.target.value)}
                placeholder="+90 (533) 873 77 12"
                maxLength={60}
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-3.5 flex flex-col gap-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">
                Sample WhatsApp Order Preview
              </span>
              <a
                href={sampleOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3 py-2 bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] text-xs font-medium text-[#0A0A0A] inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <span>Test WhatsApp Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <pre className="text-xs text-[#0A0A0A] whitespace-pre-wrap break-words font-mono p-3 bg-[#FFFFFF] border border-[#E8E4DC] overflow-x-auto">
              {sampleOrderLines}
            </pre>
          </div>
        </section>

        {/* Section 2: Currency, Shipping & Inventory Thresholds */}
        <section className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4 min-w-0">
          <div className="border-b border-[#E8E4DC] pb-3">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
              02 • Currency, Shipping & Stock Thresholds
            </h3>
            <p className="text-xs text-[#525252] mt-1">
              Storefront pricing currency, flat shipping fee, free shipping target, and low-stock warning threshold.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className={ATELIER_LABEL_CLASS}>Display Currency</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CURRENCIES.map((c) => {
                const active = currency === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCurrencySelect(c)}
                    className={`min-h-[44px] py-2.5 px-3 text-xs font-semibold uppercase tracking-wider border cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                      active
                        ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                        : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                    }`}
                  >
                    {c} ({CURRENCY_SYMBOLS[c]})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={shippingFeeId} className={ATELIER_LABEL_CLASS}>
                Shipping Fee ({currency})
              </label>
              <input
                id={shippingFeeId}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={shippingFeeInput}
                onChange={(e) => setShippingFeeInput(e.target.value)}
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
              <span className="text-[11px] text-[#525252]">
                Set to 0 for complimentary standard dispatch.
              </span>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={freeThresholdId} className={ATELIER_LABEL_CLASS}>
                Free Shipping Threshold ({currency})
              </label>
              <input
                id={freeThresholdId}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={freeShippingThresholdInput}
                onChange={(e) => setFreeShippingThresholdInput(e.target.value)}
                placeholder="Disabled if empty"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
              <span className="text-[11px] text-[#525252]">
                Leave blank to disable automatic free shipping threshold.
              </span>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={lowStockId} className={ATELIER_LABEL_CLASS}>
                Low Stock Alert Threshold
              </label>
              <input
                id={lowStockId}
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                value={lowStockThresholdInput}
                onChange={(e) => setLowStockThresholdInput(e.target.value)}
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
              <span className="text-[11px] text-[#525252]">
                Products at or below this count trigger low-stock alerts.
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: Theme, Language & Announcement */}
        <section className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4 min-w-0">
          <div className="border-b border-[#E8E4DC] pb-3">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
              03 • Storefront Theme, Locale & Announcement
            </h3>
            <p className="text-xs text-[#525252] mt-1">
              Control active palette preset, default storefront language, and top announcement banner.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className={ATELIER_LABEL_CLASS}>Active Storefront Theme</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STOREFRONT_THEMES.map((theme) => {
                const active = activeTheme === theme.value;
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => setActiveTheme(theme.value)}
                    className={`min-h-[44px] px-3 py-2.5 border text-left flex flex-col justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                      active
                        ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                        : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {theme.label}
                    </span>
                    <span
                      className={`text-[10px] ${
                        active ? "text-[#E8E4DC]" : "text-[#525252]"
                      }`}
                    >
                      {theme.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className={ATELIER_LABEL_CLASS}>Default Storefront Language</span>
            <div className="grid grid-cols-2 gap-2.5 max-w-sm">
              {(["tr", "en"] as const).map((lang) => {
                const active = defaultLang === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setDefaultLang(lang)}
                    className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                      active
                        ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                        : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                    }`}
                  >
                    {lang === "tr" ? "Turkish (TR)" : "English (EN)"}
                  </button>
                );
              })}
            </div>
          </div>

          <ToggleRow
            label="Announcement Banner Visibility"
            description="Show or hide the global announcement text on the storefront"
            checked={announcementEnabled}
            onChange={setAnnouncementEnabled}
            enabledText="Active"
            disabledText="Off"
          />

          <div className="flex flex-col gap-1.5 min-w-0">
            <label htmlFor={announcementId} className={ATELIER_LABEL_CLASS}>
              Announcement Copy
            </label>
            <input
              id={announcementId}
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              maxLength={300}
              placeholder="GLOBAL EXPRESS DISPATCH • NORTH CYPRUS • PARIS • TOKYO"
              className={ATELIER_INPUT_CLASS}
            />
            <div className="bg-[#FAF8F3] border border-[#E8E4DC] px-3 py-2 flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono uppercase text-[#525252] shrink-0">
                Preview:
              </span>
              <span className="text-xs font-mono text-[#0A0A0A] truncate">
                {announcement ||
                  "GLOBAL EXPRESS DISPATCH • NORTH CYPRUS • PARIS • TOKYO"}
              </span>
            </div>
          </div>
        </section>

        {/* Section 4: Brand Identity, Contact & Social Channels */}
        <section className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4 min-w-0">
          <div className="border-b border-[#E8E4DC] pb-3">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
              04 • Brand Identity & Social Channels
            </h3>
            <p className="text-xs text-[#525252] mt-1">
              Store name, studio location, support email, editorial bio, and social profiles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={storeNameId} className={ATELIER_LABEL_CLASS}>
                Store Name
              </label>
              <input
                id={storeNameId}
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                maxLength={100}
                className={ATELIER_INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={supportEmailId} className={ATELIER_LABEL_CLASS}>
                Support Email
              </label>
              <input
                id={supportEmailId}
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                maxLength={255}
                placeholder="contact@cyruxstudio.com"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label htmlFor={locationId} className={ATELIER_LABEL_CLASS}>
              Studio Location Label
            </label>
            <input
              id={locationId}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={150}
              className={ATELIER_INPUT_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label htmlFor={brandBioId} className={ATELIER_LABEL_CLASS}>
              Brand Bio / Tagline
            </label>
            <textarea
              id={brandBioId}
              rows={2}
              value={brandBio}
              onChange={(e) => setBrandBio(e.target.value)}
              maxLength={500}
              className={ATELIER_TEXTAREA_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={igLinkId} className={ATELIER_LABEL_CLASS}>
                Instagram URL
              </label>
              <input
                id={igLinkId}
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/cyruxstudio"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={xLinkId} className={ATELIER_LABEL_CLASS}>
                Twitter / X URL
              </label>
              <input
                id={xLinkId}
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/cyruxstudio"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={tiktokLinkId} className={ATELIER_LABEL_CLASS}>
                TikTok URL
              </label>
              <input
                id={tiktokLinkId}
                type="url"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="https://tiktok.com/@cyruxstudio"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={igHandleId} className={ATELIER_LABEL_CLASS}>
                Instagram Handle
              </label>
              <input
                id={igHandleId}
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@cyruxstudio"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={xHandleId} className={ATELIER_LABEL_CLASS}>
                Twitter / X Handle
              </label>
              <input
                id={xHandleId}
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                placeholder="@cyruxstudio"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label htmlFor={tiktokHandleId} className={ATELIER_LABEL_CLASS}>
                TikTok Handle
              </label>
              <input
                id={tiktokHandleId}
                type="text"
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
                placeholder="@cyruxstudio"
                className={`${ATELIER_INPUT_CLASS} font-mono`}
              />
            </div>
          </div>
        </section>

        {/* Section 5: Editorial Hero & About Image Fallbacks */}
        <section className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4 min-w-0">
          <div className="border-b border-[#E8E4DC] pb-3">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
              05 • Editorial Hero & About Visual Fallbacks
            </h3>
            <p className="text-xs text-[#525252] mt-1">
              Fallback desktop (16:9) and mobile (3:4) imagery stored in StoreSettings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <MediaField
              label="Hero Desktop Image"
              value={heroDesktopImage}
              onChange={setHeroDesktopImage}
              mediaType="image"
              aspectHint="16:9 Widescreen"
              defaultValue="/assets/editorial/hero-desktop.jpg"
            />
            <MediaField
              label="Hero Mobile Image"
              value={heroMobileImage}
              onChange={setHeroMobileImage}
              mediaType="image"
              aspectHint="3:4 Portrait"
              defaultValue="/assets/editorial/hero-mobile.jpg"
            />
            <MediaField
              label="About Desktop Image"
              value={aboutDesktopImage}
              onChange={setAboutDesktopImage}
              mediaType="image"
              aspectHint="16:9 Widescreen"
              defaultValue="/assets/editorial/about-desktop.jpg"
            />
            <MediaField
              label="About Mobile Image"
              value={aboutMobileImage}
              onChange={setAboutMobileImage}
              mediaType="image"
              aspectHint="3:4 Portrait"
              defaultValue="/assets/editorial/about-mobile.jpg"
            />
          </div>
        </section>

        {/* Inline bottom Save Bar (does not collide with AdminBottomNav) */}
        <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-xs text-[#525252]">
            Changes apply immediately to public storefront pricing, shipping, and concierge links.
          </p>
          <button
            type="submit"
            disabled={saving || loading}
            className={`${ATELIER_BTN_PRIMARY} w-full sm:w-auto min-w-[180px]`}
          >
            {saving
              ? "Saving Settings..."
              : loading
              ? "Loading Settings..."
              : "Save Store Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
