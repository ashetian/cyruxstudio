"use client";

import React from "react";
import { DEFAULT_STOREFRONT_CMS } from "@/lib/cms";
import {
  ATELIER_INPUT_CLASS,
  ATELIER_LABEL_CLASS,
  ChipListEditor,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  MediaField,
  TextAreaField,
  TextField,
  ToggleRow,
} from "./cms-field-primitives";

export function SeoEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"seo">) {
  const defaults = DEFAULT_STOREFRONT_CMS.seo;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Search Engine Metadata & Canonical URL"
        description="Configure dynamic site title, meta description, keywords, and social handles."
      >
        <TextField
          label="Canonical Site URL"
          type="url"
          value={value.siteUrl}
          onChange={(siteUrl) => onChange({ ...value, siteUrl })}
          placeholder="https://cyruxstudio.com"
          mono
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Default Page Title (titleDefault)"
            value={value.titleDefault}
            onChange={(titleDefault) => onChange({ ...value, titleDefault })}
            maxLength={160}
          />
          <TextField
            label="Title Template"
            value={value.titleTemplate}
            onChange={(titleTemplate) => onChange({ ...value, titleTemplate })}
            maxLength={100}
            placeholder="%s | cyrux studio"
            mono
          />
        </div>

        <TextAreaField
          label="Meta Description"
          value={value.description}
          onChange={(description) => onChange({ ...value, description })}
          maxLength={400}
          rows={3}
          helper={`${value.description.length} / 400 characters`}
        />

        <ChipListEditor
          label="SEO Keywords"
          items={value.keywords}
          onChange={(keywords) => onChange({ ...value, keywords })}
          placeholder="Add SEO keyword..."
          maxItems={30}
          maxLength={60}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Twitter Creator"
            value={value.twitterCreator}
            onChange={(twitterCreator) =>
              onChange({ ...value, twitterCreator })
            }
            maxLength={60}
            mono
          />
          <TextField
            label="Twitter Site"
            value={value.twitterSite}
            onChange={(twitterSite) => onChange({ ...value, twitterSite })}
            maxLength={60}
            mono
          />
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Open Graph Image, Locale & Theme Color"
        description="Social share card image, default storefront language, and browser theme color."
      >
        <MediaField
          label="Open Graph Share Image (ogImage)"
          value={value.ogImage}
          onChange={(ogImage) => onChange({ ...value, ogImage })}
          mediaType="image"
          aspectHint="1200x630 Open Graph"
          defaultValue={defaults.ogImage}
        />

        <TextField
          label="Open Graph Image Alt"
          value={value.ogAlt}
          onChange={(ogAlt) => onChange({ ...value, ogAlt })}
          maxLength={160}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <span className={ATELIER_LABEL_CLASS}>Default Storefront Language</span>
            <div className="grid grid-cols-2 gap-2">
              {(["tr", "en"] as const).map((lang) => {
                const active = value.defaultLang === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => onChange({ ...value, defaultLang: lang })}
                    className={`min-h-[44px] px-3 py-2 text-xs font-semibold uppercase tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
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

          <div className="flex flex-col gap-2 min-w-0">
            <span className={ATELIER_LABEL_CLASS}>Browser Theme Color</span>
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="color"
                aria-label="Theme color picker"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(value.themeColor)
                    ? value.themeColor
                    : "#FAF8F3"
                }
                onChange={(e) =>
                  onChange({ ...value, themeColor: e.target.value })
                }
                className="min-h-[44px] min-w-[44px] w-12 p-1 bg-[#FFFFFF] border border-[#E8E4DC] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              />
              <input
                type="text"
                aria-label="Theme color hex"
                value={value.themeColor}
                onChange={(e) =>
                  onChange({ ...value, themeColor: e.target.value })
                }
                maxLength={30}
                className={`${ATELIER_INPUT_CLASS} font-mono flex-1 min-w-0`}
              />
            </div>
          </div>
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Homepage Section Visibility"
        description="Show or hide major homepage blocks without modifying storefront code."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Show Lookbook Section"
            description="Toggle CampaignBlock and lookbook cards on homepage"
            checked={value.showLookbookSection}
            onChange={(showLookbookSection) =>
              onChange({ ...value, showLookbookSection })
            }
          />
          <ToggleRow
            label="Show Collections Section"
            description="Toggle Featured Collections showcase on homepage"
            checked={value.showCollectionsSection}
            onChange={(showCollectionsSection) =>
              onChange({ ...value, showCollectionsSection })
            }
          />
          <ToggleRow
            label="Show FAQ Section"
            description="Toggle FAQ accordion block on homepage"
            checked={value.showFaqSection}
            onChange={(showFaqSection) =>
              onChange({ ...value, showFaqSection })
            }
          />
          <ToggleRow
            label="Show Contact Section"
            description="Toggle Atelier Contact block on homepage"
            checked={value.showContactSection}
            onChange={(showContactSection) =>
              onChange({ ...value, showContactSection })
            }
          />
        </div>
      </CmsSectionCard>

      <CmsSaveBar
        isDirty={isDirty}
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={onSave}
        onResetDefaults={onResetDefaults}
        saveLabel="Save SEO & Visibility"
      />
    </div>
  );
}
