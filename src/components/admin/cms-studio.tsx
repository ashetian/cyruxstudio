"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  LayoutTemplate,
  RotateCcw,
} from "lucide-react";
import {
  CMS_SECTION_KEYS,
  type CmsSectionKey,
  DEFAULT_STOREFRONT_CMS,
  type StorefrontCmsConfig,
} from "@/lib/cms";
import { AdminBottomSheet } from "@/components/admin/admin-bottom-sheet";
import {
  ATELIER_BTN_SECONDARY,
} from "@/components/admin/cms/cms-field-primitives";
import { HeroEditor } from "@/components/admin/cms/hero-editor";
import { MarqueeEditor } from "@/components/admin/cms/marquee-editor";
import { LookbookEditor } from "@/components/admin/cms/lookbook-editor";
import { CollectionsSectionEditor } from "@/components/admin/cms/collections-section-editor";
import { AboutEditor } from "@/components/admin/cms/about-editor";
import { FaqEditor } from "@/components/admin/cms/faq-editor";
import { ContactEditor } from "@/components/admin/cms/contact-editor";
import { LegalEditor } from "@/components/admin/cms/legal-editor";
import { FooterEditor } from "@/components/admin/cms/footer-editor";
import { NavigationEditor } from "@/components/admin/cms/navigation-editor";
import { SeoEditor } from "@/components/admin/cms/seo-editor";

export interface CmsStudioProps {
  initialSection?: CmsSectionKey;
  onSaved?: () => void;
}

interface SectionMeta {
  label: string;
  description: string;
}

const SECTION_META: Record<CmsSectionKey, SectionMeta> = {
  hero: {
    label: "Hero",
    description: "Headlines, CTAs, 3D logo toggle, search pill, and hero media",
  },
  marquee: {
    label: "Marquee",
    description: "Announcement ticker strip, scroll speed, and links",
  },
  lookbook: {
    label: "Lookbook",
    description: "Editorial archive cards, campaign video, and gallery frames",
  },
  collectionsSection: {
    label: "Collections Section",
    description: "Catalog headings, search tags, and product spec defaults",
  },
  about: {
    label: "Manifesto & About",
    description: "Brand stamps, monumental headlines, visuals, and story blocks",
  },
  faq: {
    label: "FAQ",
    description: "Categorized bilingual customer questions and answers",
  },
  contact: {
    label: "Contact",
    description: "Support email, WhatsApp concierge, address, hours, and socials",
  },
  legal: {
    label: "Legal & Policies",
    description: "Privacy, Terms, Shipping, and Distance Sales clauses",
  },
  footer: {
    label: "Footer",
    description: "Monumental navigation rows, emblem, copyright, and legal labels",
  },
  navigation: {
    label: "Navigation",
    description: "Floating bottom pill links, menu drawer links, and 404 copy",
  },
  seo: {
    label: "SEO & Metadata",
    description: "Meta titles, description, keywords, OG image, and section toggles",
  },
};

export function CmsStudio({ initialSection = "hero", onSaved }: CmsStudioProps) {
  const [selectedSection, setSelectedSection] =
    useState<CmsSectionKey>(initialSection);
  const [cms, setCms] = useState<StorefrontCmsConfig>(() =>
    structuredClone(DEFAULT_STOREFRONT_CMS)
  );
  const [draftCms, setDraftCms] = useState<StorefrontCmsConfig>(() =>
    structuredClone(DEFAULT_STOREFRONT_CMS)
  );
  const [dirtyMap, setDirtyMap] = useState<Partial<Record<CmsSectionKey, boolean>>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAtMap, setSavedAtMap] = useState<
    Partial<Record<CmsSectionKey, string>>
  >({});
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);

  const loadCms = useCallback(async () => {
    setConfirmReload(false);
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/cms");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        cms?: StorefrontCmsConfig;
        error?: string;
      };
      if (!res.ok || !data.success || !data.cms) {
        throw new Error(data.error || "Failed to load storefront CMS");
      }
      setCms(data.cms);
      setDraftCms(structuredClone(data.cms));
      setDirtyMap({});
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : "Unable to sync CMS sections"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCms();
  }, [loadCms]);

  useEffect(() => {
    setSelectedSection(initialSection);
    setSaveError(null);
  }, [initialSection]);

  const updateSectionDraft = <K extends CmsSectionKey>(
    section: K,
    nextValue: StorefrontCmsConfig[K]
  ) => {
    setDraftCms((prev) => ({
      ...prev,
      [section]: nextValue,
    }));
    setDirtyMap((prev) => ({
      ...prev,
      [section]: true,
    }));
    setSaveError(null);
  };

  const handleResetSectionDefaults = (section: CmsSectionKey) => {
    const defaultSlice = structuredClone(DEFAULT_STOREFRONT_CMS[section]);
    setDraftCms((prev) => ({
      ...prev,
      [section]: defaultSlice,
    }));
    setDirtyMap((prev) => ({
      ...prev,
      [section]: true,
    }));
    setSaveError(null);
  };

  const handleSaveSection = async (section: CmsSectionKey) => {
    if (loading || saving) return;
    setSaveError(null);

    let payload = draftCms[section];

    if (section === "contact") {
      const contactData = payload as StorefrontCmsConfig["contact"];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.supportEmail.trim())) {
        setSaveError("Contact supportEmail must be a valid email address.");
        return;
      }
    }

    if (section === "faq") {
      const faqData = payload as StorefrontCmsConfig["faq"];
      payload = {
        ...faqData,
        items: faqData.items.map((item) => ({
          ...item,
          category: item.category.trim() ? item.category.trim() : "General",
        })),
      };
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cms/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        cms?: StorefrontCmsConfig;
        data?: StorefrontCmsConfig[CmsSectionKey];
        error?: string;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to save ${section}`);
      }

      if (data.cms) {
        setCms(data.cms);
        setDraftCms((prev) => ({
          ...prev,
          [section]: structuredClone(data.cms![section]),
        }));
      } else if (data.data) {
        setCms((prev) => ({ ...prev, [section]: data.data }));
        setDraftCms((prev) => ({
          ...prev,
          [section]: structuredClone(data.data!),
        }));
      }

      setDirtyMap((prev) => ({
        ...prev,
        [section]: false,
      }));
      setSavedAtMap((prev) => ({
        ...prev,
        [section]: new Date().toLocaleTimeString(),
      }));
      onSaved?.();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save CMS section"
      );
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = SECTION_META[selectedSection];
  const activeIsDirty = Boolean(dirtyMap[selectedSection]);
  const activeSavedAt = savedAtMap[selectedSection] ?? null;
  const hasAnyDirty = Object.values(dirtyMap).some(Boolean);

  useEffect(() => {
    if (!hasAnyDirty) {
      setConfirmReload(false);
    }
  }, [hasAnyDirty]);

  const renderActiveEditor = () => {
    const commonProps = {
      saving: saving || loading,
      isDirty: activeIsDirty,
      savedAt: activeSavedAt,
      error: saveError,
      onSave: () => void handleSaveSection(selectedSection),
      onResetDefaults: () => handleResetSectionDefaults(selectedSection),
    };

    switch (selectedSection) {
      case "hero":
        return (
          <HeroEditor
            value={draftCms.hero}
            onChange={(next) => updateSectionDraft("hero", next)}
            {...commonProps}
          />
        );
      case "marquee":
        return (
          <MarqueeEditor
            value={draftCms.marquee}
            onChange={(next) => updateSectionDraft("marquee", next)}
            {...commonProps}
          />
        );
      case "lookbook":
        return (
          <LookbookEditor
            value={draftCms.lookbook}
            onChange={(next) => updateSectionDraft("lookbook", next)}
            {...commonProps}
          />
        );
      case "collectionsSection":
        return (
          <CollectionsSectionEditor
            value={draftCms.collectionsSection}
            onChange={(next) => updateSectionDraft("collectionsSection", next)}
            {...commonProps}
          />
        );
      case "about":
        return (
          <AboutEditor
            value={draftCms.about}
            onChange={(next) => updateSectionDraft("about", next)}
            {...commonProps}
          />
        );
      case "faq":
        return (
          <FaqEditor
            value={draftCms.faq}
            onChange={(next) => updateSectionDraft("faq", next)}
            {...commonProps}
          />
        );
      case "contact":
        return (
          <ContactEditor
            value={draftCms.contact}
            onChange={(next) => updateSectionDraft("contact", next)}
            {...commonProps}
          />
        );
      case "legal":
        return (
          <LegalEditor
            value={draftCms.legal}
            onChange={(next) => updateSectionDraft("legal", next)}
            {...commonProps}
          />
        );
      case "footer":
        return (
          <FooterEditor
            value={draftCms.footer}
            onChange={(next) => updateSectionDraft("footer", next)}
            {...commonProps}
          />
        );
      case "navigation":
        return (
          <NavigationEditor
            value={draftCms.navigation}
            onChange={(next) => updateSectionDraft("navigation", next)}
            {...commonProps}
          />
        );
      case "seo":
        return (
          <SeoEditor
            value={draftCms.seo}
            onChange={(next) => updateSectionDraft("seo", next)}
            {...commonProps}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-[#FAF8F3] text-[#0A0A0A] w-full min-w-0">
      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <LayoutTemplate className="w-5 h-5 shrink-0 text-[#0A0A0A]" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[#0A0A0A]">
              Storefront Content Studio
            </h2>
            <p className="text-xs text-[#525252]">
              {loading
                ? "Loading live storefront sections..."
                : `Editing ${activeMeta.label} • ${activeMeta.description}`}
            </p>
          </div>
        </div>

        {hasAnyDirty && confirmReload ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => {
                setConfirmReload(false);
                void loadCms();
              }}
              className="min-h-[44px] px-3.5 py-2 bg-red-700 text-[#FFFFFF] border border-red-700 text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            >
              Confirm Reload
            </button>
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => setConfirmReload(false)}
              className={ATELIER_BTN_SECONDARY}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (hasAnyDirty) {
                setConfirmReload(true);
                return;
              }
              void loadCms();
            }}
            disabled={loading || saving}
            className={ATELIER_BTN_SECONDARY}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{loading ? "Syncing..." : "Reload CMS"}</span>
          </button>
        )}
      </div>

      {loadError && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300 text-amber-900 text-xs p-3.5 flex flex-wrap items-center justify-between gap-2"
        >
          <span>{loadError} (showing fallback defaults)</span>
          <button
            type="button"
            onClick={() => void loadCms()}
            className="min-h-[44px] px-3 py-1.5 bg-[#FFFFFF] border border-[#E8E4DC] text-xs font-medium text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Mobile section selector button opening bottom sheet */}
      <div className="md:hidden min-w-0">
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="w-full min-h-[48px] bg-[#FFFFFF] border border-[#E8E4DC] hover:border-[#0A0A0A] px-4 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#525252]">
              Active Section ({CMS_SECTION_KEYS.indexOf(selectedSection) + 1} /{" "}
              {CMS_SECTION_KEYS.length})
            </div>
            <div className="text-sm font-semibold text-[#0A0A0A] truncate">
              {activeMeta.label}
              {activeIsDirty ? " • Unsaved" : ""}
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-[#0A0A0A] inline-flex items-center gap-1">
            <span>Switch</span>
            <ChevronDown className="w-4 h-4" />
          </span>
        </button>
      </div>

      {/* Desktop horizontal section pills */}
      <div className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-1 min-w-0">
        {CMS_SECTION_KEYS.map((key) => {
          const active = selectedSection === key;
          const isDirty = Boolean(dirtyMap[key]);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedSection(key);
                setSaveError(null);
              }}
              className={`min-h-[44px] shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-medium uppercase tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                active
                  ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                  : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC] hover:text-[#0A0A0A] hover:border-[#0A0A0A]"
              }`}
            >
              {SECTION_META[key].label}
              {isDirty ? " •" : ""}
            </button>
          );
        })}
      </div>

      {/* Active section editor */}
      <div className="min-w-0" data-cms-synced={Boolean(cms)}>
        {renderActiveEditor()}
      </div>

      {/* Mobile section switcher bottom sheet */}
      <AdminBottomSheet
        isOpen={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        title="Storefront Sections"
        subtitle="Select any storefront block to edit live copy and media"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CMS_SECTION_KEYS.map((key) => {
            const active = selectedSection === key;
            const isDirty = Boolean(dirtyMap[key]);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedSection(key);
                  setSaveError(null);
                  setMobileSheetOpen(false);
                }}
                className={`min-h-[44px] p-3.5 border text-left flex flex-col gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  active
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {SECTION_META[key].label}
                  </span>
                  {isDirty && (
                    <span
                      className={`text-[10px] font-mono uppercase ${
                        active ? "text-[#FFFFFF]" : "text-amber-800"
                      }`}
                    >
                      Unsaved
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] ${
                    active ? "text-[#E8E4DC]" : "text-[#525252]"
                  }`}
                >
                  {SECTION_META[key].description}
                </span>
              </button>
            );
          })}
        </div>
      </AdminBottomSheet>
    </div>
  );
}
