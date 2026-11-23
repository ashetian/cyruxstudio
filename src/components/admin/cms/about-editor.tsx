"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import {
  DEFAULT_STOREFRONT_CMS,
  type AboutStoryBlockCms,
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
  moveArrayItem,
} from "./cms-field-primitives";

export function AboutEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"about">) {
  const defaults = DEFAULT_STOREFRONT_CMS.about;
  const [expandedBlockIdx, setExpandedBlockIdx] = useState<number | null>(0);

  const handleAddBlock = () => {
    if (value.storyBlocks.length >= 20) return;
    const nextIndexNumber = String(value.storyBlocks.length + 1).padStart(
      2,
      "0"
    );
    const nextBlock: AboutStoryBlockCms = {
      id: `about-${Date.now()}`,
      index: nextIndexNumber,
      title: { tr: "YENİ MANİFESTO BAŞLIĞI", en: "NEW MANIFESTO CHAPTER" },
      body: {
        tr: "Atölye felsefesi ve üretim detayı.",
        en: "Atelier philosophy and garment craft details.",
      },
    };
    const nextBlocks = [...value.storyBlocks, nextBlock];
    onChange({ ...value, storyBlocks: nextBlocks });
    setExpandedBlockIdx(nextBlocks.length - 1);
  };

  const handleUpdateBlock = (
    index: number,
    patch: Partial<AboutStoryBlockCms>
  ) => {
    const nextBlocks = value.storyBlocks.map((block, idx) =>
      idx === index ? { ...block, ...patch } : block
    );
    onChange({ ...value, storyBlocks: nextBlocks });
  };

  const handleMoveBlock = (fromIndex: number, toIndex: number) => {
    const nextBlocks = moveArrayItem(value.storyBlocks, fromIndex, toIndex);
    onChange({ ...value, storyBlocks: nextBlocks });
    setExpandedBlockIdx(toIndex);
  };

  const handleRemoveBlock = (index: number) => {
    const nextBlocks = value.storyBlocks.filter((_, idx) => idx !== index);
    onChange({ ...value, storyBlocks: nextBlocks });
    setExpandedBlockIdx(null);
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Manifesto Stamps & Monumental Headlines"
        description="Edit brand stamp, studio location stamp, and the three monumental headline lines."
      >
        <TextField
          label="Brand Stamp"
          value={value.brandStamp}
          onChange={(brandStamp) => onChange({ ...value, brandStamp })}
          maxLength={120}
          mono
        />

        <BilingualField
          label="Location Stamp"
          value={value.locationStamp}
          onChange={(locationStamp) => onChange({ ...value, locationStamp })}
        />

        <BilingualField
          label="Headline Line 1"
          value={value.headlineLine1}
          onChange={(headlineLine1) => onChange({ ...value, headlineLine1 })}
        />

        <BilingualField
          label="Headline Line 2"
          value={value.headlineLine2}
          onChange={(headlineLine2) => onChange({ ...value, headlineLine2 })}
        />

        <BilingualField
          label="Headline Line 3"
          value={value.headlineLine3}
          onChange={(headlineLine3) => onChange({ ...value, headlineLine3 })}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Manifesto Editorial Visuals"
        description="Full-bleed desktop and mobile imagery for the About section."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MediaField
            label="About Desktop Image"
            value={value.desktopImage}
            onChange={(desktopImage) => onChange({ ...value, desktopImage })}
            mediaType="image"
            aspectHint="16:9 Widescreen"
            defaultValue={defaults.desktopImage}
          />
          <MediaField
            label="About Mobile Image"
            value={value.mobileImage}
            onChange={(mobileImage) => onChange({ ...value, mobileImage })}
            mediaType="image"
            aspectHint="3:4 Portrait"
            defaultValue={defaults.mobileImage}
          />
        </div>

        <BilingualField
          label="About Image Alt Text"
          value={value.imageAlt}
          onChange={(imageAlt) => onChange({ ...value, imageAlt })}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Manifesto Story Blocks"
        badge={`${value.storyBlocks.length} / 20`}
        description="Ordered narrative chapters displayed on the Manifesto / About page."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#525252]">
            Use arrows to reorder story chapters.
          </span>
          <button
            type="button"
            onClick={handleAddBlock}
            disabled={value.storyBlocks.length >= 20}
            className={`min-h-[44px] ${ATELIER_BTN_PRIMARY}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Story Block</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {value.storyBlocks.map((block, idx) => (
            <ArrayItemCard
              key={block.id || `story-${idx}`}
              index={idx}
              total={value.storyBlocks.length}
              title={`[${block.index || String(idx + 1).padStart(2, "0")}] ${
                block.title.en || block.title.tr || "Untitled Chapter"
              }`}
              subtitle={block.title.tr}
              isExpanded={expandedBlockIdx === idx}
              onToggleExpand={() =>
                setExpandedBlockIdx(expandedBlockIdx === idx ? null : idx)
              }
              onMoveUp={() => handleMoveBlock(idx, idx - 1)}
              onMoveDown={() => handleMoveBlock(idx, idx + 1)}
              onRemove={() => handleRemoveBlock(idx)}
            >
              <TextField
                label="Chapter Index"
                value={block.index}
                onChange={(index) => handleUpdateBlock(idx, { index })}
                maxLength={20}
                mono
                placeholder="01"
              />
              <BilingualField
                label="Chapter Title"
                value={block.title}
                onChange={(title) => handleUpdateBlock(idx, { title })}
              />
              <BilingualField
                label="Chapter Narrative"
                value={block.body}
                onChange={(body) => handleUpdateBlock(idx, { body })}
                multiline
                rows={4}
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
        saveLabel="Save Manifesto & About"
      />
    </div>
  );
}
