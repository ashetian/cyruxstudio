"use client";

import React from "react";
import { DEFAULT_STOREFRONT_CMS } from "@/lib/cms";
import {
  BilingualField,
  ChipListEditor,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  MediaField,
  TextField,
  ToggleRow,
} from "./cms-field-primitives";

export function HeroEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"hero">) {
  const defaults = DEFAULT_STOREFRONT_CMS.hero;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Hero Visibility Controls"
        description="Toggle monumental 3D emblem, headlines, action buttons, and live search bar."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Show 3D Logo Emblem"
            description="Interactive WebGL cyrux centerpiece on hero canvas"
            checked={value.show3DLogo}
            onChange={(checked) => onChange({ ...value, show3DLogo: checked })}
          />
          <ToggleRow
            label="Show Editorial Headlines"
            description="Display eyebrow, headline, and subcopy over hero media"
            checked={value.showHeadlines}
            onChange={(checked) => onChange({ ...value, showHeadlines: checked })}
          />
          <ToggleRow
            label="Show Primary & Secondary CTAs"
            description="Render call-to-action buttons below the headline"
            checked={value.showCtas}
            onChange={(checked) => onChange({ ...value, showCtas: checked })}
          />
          <ToggleRow
            label="Show Hero Search Pill"
            description="Top-center storefront search bar inside hero"
            checked={value.showSearchPill}
            onChange={(checked) => onChange({ ...value, showSearchPill: checked })}
          />
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Hero Copy & Calls to Action"
        description="Bilingual hero messaging and button destinations."
      >
        <BilingualField
          label="Eyebrow Label"
          value={value.eyebrow}
          onChange={(eyebrow) => onChange({ ...value, eyebrow })}
          placeholderTr="BÖLÜM 00 • İLK ARŞİV"
          placeholderEn="CHAPTER 00 • INAUGURAL ARCHIVE"
        />

        <BilingualField
          label="Headline"
          value={value.headline}
          onChange={(headline) => onChange({ ...value, headline })}
          placeholderTr="Giyilebilir Sanat. Sınırsız Silüet."
          placeholderEn="Wearable Art. Uncompromising Form."
        />

        <BilingualField
          label="Subcopy"
          value={value.subcopy}
          onChange={(subcopy) => onChange({ ...value, subcopy })}
          multiline
          rows={3}
        />

        <BilingualField
          label="Latest Drop Pill Label"
          value={value.latestDropPillLabel}
          onChange={(latestDropPillLabel) =>
            onChange({ ...value, latestDropPillLabel })
          }
          placeholderTr="SON DROP"
          placeholderEn="LATEST DROP"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E8E4DC]">
          <div className="flex flex-col gap-3">
            <BilingualField
              label="Primary CTA Label"
              value={value.primaryCtaLabel}
              onChange={(primaryCtaLabel) =>
                onChange({ ...value, primaryCtaLabel })
              }
            />
            <TextField
              label="Primary CTA Href"
              value={value.primaryCtaHref}
              onChange={(primaryCtaHref) =>
                onChange({ ...value, primaryCtaHref })
              }
              placeholder="#shop"
              mono
            />
          </div>

          <div className="flex flex-col gap-3">
            <BilingualField
              label="Secondary CTA Label"
              value={value.secondaryCtaLabel}
              onChange={(secondaryCtaLabel) =>
                onChange({ ...value, secondaryCtaLabel })
              }
            />
            <TextField
              label="Secondary CTA Href"
              value={value.secondaryCtaHref}
              onChange={(secondaryCtaHref) =>
                onChange({ ...value, secondaryCtaHref })
              }
              placeholder="/shop"
              mono
            />
          </div>
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Hero Media Assets"
        description="Separate widescreen desktop, portrait mobile, and optional background campaign video."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MediaField
            label="Desktop Hero Image (desktopImage)"
            value={value.desktopImage}
            onChange={(desktopImage) => onChange({ ...value, desktopImage })}
            mediaType="image"
            aspectHint="16:9 Widescreen"
            defaultValue={defaults.desktopImage}
          />
          <MediaField
            label="Mobile Hero Image (mobileImage)"
            value={value.mobileImage}
            onChange={(mobileImage) => onChange({ ...value, mobileImage })}
            mediaType="image"
            aspectHint="3:4 Portrait"
            defaultValue={defaults.mobileImage}
          />
        </div>

        <MediaField
          label="Optional Hero Video URL (videoUrl)"
          value={value.videoUrl}
          onChange={(videoUrl) => onChange({ ...value, videoUrl })}
          mediaType="video"
          aspectHint="MP4 / MOV"
          defaultValue={defaults.videoUrl}
          helper="Leave empty to use static editorial photography."
        />

        <BilingualField
          label="Hero Image Alt Text"
          value={value.imageAlt}
          onChange={(imageAlt) => onChange({ ...value, imageAlt })}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Hero Search Pill & Suggestions"
        description="Configure placeholder text and quick-pick tags inside the search modal."
      >
        <BilingualField
          label="Search Placeholder"
          value={value.searchPlaceholder}
          onChange={(searchPlaceholder) =>
            onChange({ ...value, searchPlaceholder })
          }
        />
        <ChipListEditor
          label="Suggested Search Terms"
          items={value.suggestedSearchTerms}
          onChange={(suggestedSearchTerms) =>
            onChange({ ...value, suggestedSearchTerms })
          }
          placeholder="Add search term..."
          maxItems={20}
          maxLength={60}
        />
      </CmsSectionCard>

      <CmsSaveBar
        isDirty={isDirty}
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={onSave}
        onResetDefaults={onResetDefaults}
        saveLabel="Save Hero Section"
      />
    </div>
  );
}
