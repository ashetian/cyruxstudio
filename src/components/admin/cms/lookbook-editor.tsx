"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import {
  DEFAULT_STOREFRONT_CMS,
  type LookbookCardCms,
  type LookbookGalleryItemCms,
} from "@/lib/cms";
import {
  ATELIER_BTN_PRIMARY,
  ArrayItemCard,
  BilingualField,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  MediaField,
  TextField,
  ToggleRow,
  moveArrayItem,
} from "./cms-field-primitives";

export function LookbookEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"lookbook">) {
  const defaults = DEFAULT_STOREFRONT_CMS.lookbook;
  const [expandedGalleryIdx, setExpandedGalleryIdx] = useState<number | null>(0);

  const updateCard = (
    key: "card1" | "card2",
    patch: Partial<LookbookCardCms>
  ) => {
    onChange({
      ...value,
      [key]: {
        ...value[key],
        ...patch,
      },
    });
  };

  const handleAddGalleryItem = () => {
    if (value.gallery.length >= 30) return;
    const nextItem: LookbookGalleryItemCms = {
      id: `lb-${Date.now()}`,
      imageUrl: "/assets/editorial/hero-desktop.jpg",
      title: { tr: "YENİ KARE", en: "NEW FRAME" },
      caption: {
        tr: "Arşiv lookbook kare açıklaması.",
        en: "Archival lookbook editorial caption.",
      },
      tag: "ARCHIVE",
    };
    const nextGallery = [...value.gallery, nextItem];
    onChange({ ...value, gallery: nextGallery });
    setExpandedGalleryIdx(nextGallery.length - 1);
  };

  const handleUpdateGalleryItem = (
    index: number,
    patch: Partial<LookbookGalleryItemCms>
  ) => {
    const nextGallery = value.gallery.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    onChange({ ...value, gallery: nextGallery });
  };

  const handleMoveGalleryItem = (fromIndex: number, toIndex: number) => {
    const nextGallery = moveArrayItem(value.gallery, fromIndex, toIndex);
    onChange({ ...value, gallery: nextGallery });
    setExpandedGalleryIdx(toIndex);
  };

  const handleRemoveGalleryItem = (index: number) => {
    const nextGallery = value.gallery.filter((_, idx) => idx !== index);
    onChange({ ...value, gallery: nextGallery });
    setExpandedGalleryIdx(null);
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Lookbook & Editorial Showcase"
        description="Configure visibility, section eyebrow, and editorial archive subtitle."
      >
        <ToggleRow
          label="Enable Lookbook Section"
          description="Display the editorial cards and campaign film block on the homepage"
          checked={value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
          enabledText="Enabled"
          disabledText="Hidden"
        />

        <BilingualField
          label="Section Eyebrow"
          value={value.eyebrow}
          onChange={(eyebrow) => onChange({ ...value, eyebrow })}
        />

        <BilingualField
          label="Section Subtitle"
          value={value.subtitle}
          onChange={(subtitle) => onChange({ ...value, subtitle })}
          multiline
          rows={2}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Editorial Lookbook Cards"
        description="Manage the two stacked left editorial cards in the CampaignBlock layout."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-3.5 bg-[#FAF8F3] border border-[#E8E4DC] flex flex-col gap-3 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
              Editorial Card 01
            </div>
            <MediaField
              label="Card 01 Image"
              value={value.card1.imageUrl}
              onChange={(imageUrl) => updateCard("card1", { imageUrl })}
              mediaType="image"
              aspectHint="4:5 Editorial"
              defaultValue={defaults.card1.imageUrl}
            />
            <BilingualField
              label="Card 01 Badge"
              value={value.card1.badge}
              onChange={(badge) => updateCard("card1", { badge })}
            />
            <BilingualField
              label="Card 01 Alt Text"
              value={value.card1.alt}
              onChange={(alt) => updateCard("card1", { alt })}
            />
            <TextField
              label="Card 01 Link (Optional)"
              value={value.card1.href ?? ""}
              onChange={(href) => updateCard("card1", { href })}
              placeholder="#shop"
              mono
            />
          </div>

          <div className="p-3.5 bg-[#FAF8F3] border border-[#E8E4DC] flex flex-col gap-3 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
              Editorial Card 02
            </div>
            <MediaField
              label="Card 02 Image"
              value={value.card2.imageUrl}
              onChange={(imageUrl) => updateCard("card2", { imageUrl })}
              mediaType="image"
              aspectHint="4:5 Editorial"
              defaultValue={defaults.card2.imageUrl}
            />
            <BilingualField
              label="Card 02 Badge"
              value={value.card2.badge}
              onChange={(badge) => updateCard("card2", { badge })}
            />
            <BilingualField
              label="Card 02 Alt Text"
              value={value.card2.alt}
              onChange={(alt) => updateCard("card2", { alt })}
            />
            <TextField
              label="Card 02 Link (Optional)"
              value={value.card2.href ?? ""}
              onChange={(href) => updateCard("card2", { href })}
              placeholder="#shop"
              mono
            />
          </div>
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Campaign Video & Poster"
        description="Large right-column campaign motion piece inside the lookbook block."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MediaField
            label="Campaign Video URL (videoUrl)"
            value={value.videoUrl}
            onChange={(videoUrl) => onChange({ ...value, videoUrl })}
            mediaType="video"
            aspectHint="MP4 / MOV"
            defaultValue={defaults.videoUrl}
          />
          <MediaField
            label="Video Poster Image"
            value={value.posterUrl}
            onChange={(posterUrl) => onChange({ ...value, posterUrl })}
            mediaType="image"
            aspectHint="Fallback Still"
            defaultValue={defaults.posterUrl}
          />
        </div>

        <BilingualField
          label="Video Badge Label"
          value={value.videoBadge}
          onChange={(videoBadge) => onChange({ ...value, videoBadge })}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Lookbook Gallery Frames"
        badge={`${value.gallery.length} / 30`}
        description="Add, edit, reorder, or remove archive gallery cards."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#525252]">
            Gallery frames appear in the editorial lookbook strip.
          </span>
          <button
            type="button"
            onClick={handleAddGalleryItem}
            disabled={value.gallery.length >= 30}
            className={`min-h-[44px] ${ATELIER_BTN_PRIMARY}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Gallery Frame</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {value.gallery.map((item, idx) => (
            <ArrayItemCard
              key={item.id || `lb-${idx}`}
              index={idx}
              total={value.gallery.length}
              title={item.title.en || item.title.tr || `Frame ${idx + 1}`}
              subtitle={item.tag}
              isExpanded={expandedGalleryIdx === idx}
              onToggleExpand={() =>
                setExpandedGalleryIdx(expandedGalleryIdx === idx ? null : idx)
              }
              onMoveUp={() => handleMoveGalleryItem(idx, idx - 1)}
              onMoveDown={() => handleMoveGalleryItem(idx, idx + 1)}
              onRemove={() => handleRemoveGalleryItem(idx)}
            >
              <MediaField
                label="Frame Image"
                value={item.imageUrl}
                onChange={(imageUrl) =>
                  handleUpdateGalleryItem(idx, { imageUrl })
                }
                mediaType="image"
              />
              <TextField
                label="Tag"
                value={item.tag}
                onChange={(tag) => handleUpdateGalleryItem(idx, { tag })}
                maxLength={80}
                mono
              />
              <BilingualField
                label="Frame Title"
                value={item.title}
                onChange={(title) => handleUpdateGalleryItem(idx, { title })}
              />
              <BilingualField
                label="Frame Caption"
                value={item.caption}
                onChange={(caption) =>
                  handleUpdateGalleryItem(idx, { caption })
                }
                multiline
                rows={2}
              />
            </ArrayItemCard>
          ))}
        </div>
      </CmsSectionCard>

      <CmsSaveBar
        isDirty={isDirty}
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={onSave}
        onResetDefaults={onResetDefaults}
        saveLabel="Save Lookbook Section"
      />
    </div>
  );
}
