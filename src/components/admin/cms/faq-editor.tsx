"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { FaqItemCms } from "@/lib/cms";
import {
  ATELIER_BTN_PRIMARY,
  ATELIER_LABEL_CLASS,
  ArrayItemCard,
  BilingualField,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  TextField,
  ToggleRow,
  moveArrayItem,
} from "./cms-field-primitives";

const PRESET_CATEGORIES = [
  "General",
  "Sizing",
  "Care",
  "Drops",
  "Ordering",
  "Shipping",
] as const;

export function FaqEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"faq">) {
  const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const handleAddItem = () => {
    if (value.items.length >= 50) return;
    const defaultCategory =
      categoryFilter !== "All" ? categoryFilter : "General";
    const nextItem: FaqItemCms = {
      id: `faq-${Date.now()}`,
      category: defaultCategory,
      question: { tr: "Yeni soru başlığı", en: "New question title" },
      answer: {
        tr: "Detaylı yanıt metni.",
        en: "Detailed customer answer.",
      },
    };
    const nextItems = [...value.items, nextItem];
    onChange({ ...value, items: nextItems });
    setExpandedItemIdx(nextItems.length - 1);
  };

  const handleUpdateItem = (index: number, patch: Partial<FaqItemCms>) => {
    const nextItems = value.items.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    onChange({ ...value, items: nextItems });
  };

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    const nextItems = moveArrayItem(value.items, fromIndex, toIndex);
    onChange({ ...value, items: nextItems });
    setExpandedItemIdx(toIndex);
  };

  const handleRemoveItem = (index: number) => {
    const nextItems = value.items.filter((_, idx) => idx !== index);
    onChange({ ...value, items: nextItems });
    setExpandedItemIdx(null);
  };

  const availableCategories = Array.from(
    new Set([
      "All",
      ...PRESET_CATEGORIES,
      ...value.items.map((item) => item.category.trim() || "General"),
    ])
  );

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="FAQ Header & Visibility"
        description="Configure visibility and bilingual intro copy for the storefront FAQ section and /faq page."
      >
        <ToggleRow
          label="Enable FAQ Section"
          description="Show FAQ accordion on the storefront and navigation"
          checked={value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
          enabledText="Enabled"
          disabledText="Hidden"
        />

        <BilingualField
          label="FAQ Eyebrow"
          value={value.eyebrow}
          onChange={(eyebrow) => onChange({ ...value, eyebrow })}
        />

        <BilingualField
          label="FAQ Title"
          value={value.title}
          onChange={(title) => onChange({ ...value, title })}
        />

        <BilingualField
          label="FAQ Subtitle"
          value={value.subtitle}
          onChange={(subtitle) => onChange({ ...value, subtitle })}
          multiline
          rows={2}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Questions & Answers"
        badge={`${value.items.length} / 50`}
        description="Create, categorize, reorder, and remove bilingual Q&A items."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {availableCategories.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`min-h-[44px] px-3 py-1.5 text-xs font-medium border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                    active
                      ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                      : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            disabled={value.items.length >= 50}
            className={ATELIER_BTN_PRIMARY}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {value.items.map((item, idx) => {
            const resolvedCategory = item.category.trim() || "General";
            if (
              categoryFilter !== "All" &&
              resolvedCategory !== categoryFilter
            ) {
              return null;
            }
            return (
              <ArrayItemCard
                key={item.id || `faq-${idx}`}
                index={idx}
                total={value.items.length}
                title={
                  item.question.en ||
                  item.question.tr ||
                  `Question ${idx + 1}`
                }
                subtitle={`Category: ${resolvedCategory}`}
                isExpanded={expandedItemIdx === idx}
                onToggleExpand={() =>
                  setExpandedItemIdx(expandedItemIdx === idx ? null : idx)
                }
                onMoveUp={() => handleMoveItem(idx, idx - 1)}
                onMoveDown={() => handleMoveItem(idx, idx + 1)}
                onRemove={() => handleRemoveItem(idx)}
              >
                <div className="flex flex-col gap-2">
                  <TextField
                    label="Category"
                    value={item.category}
                    placeholder="General"
                    onChange={(category) =>
                      handleUpdateItem(idx, { category })
                    }
                    onBlur={() => {
                      const normalized = item.category.trim() || "General";
                      if (normalized !== item.category) {
                        handleUpdateItem(idx, { category: normalized });
                      }
                    }}
                    maxLength={80}
                    required
                    helper="Select a preset category below or type a custom label."
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`${ATELIER_LABEL_CLASS} mr-1`}>
                      Presets:
                    </span>
                    {PRESET_CATEGORIES.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          handleUpdateItem(idx, { category: preset })
                        }
                        className={`min-h-[44px] px-3 py-1.5 text-xs border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                          resolvedCategory === preset
                            ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                            : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <BilingualField
                  label="Question"
                  value={item.question}
                  onChange={(question) => handleUpdateItem(idx, { question })}
                />

                <BilingualField
                  label="Answer"
                  value={item.answer}
                  onChange={(answer) => handleUpdateItem(idx, { answer })}
                  multiline
                  rows={4}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      </CmsSectionCard>

      <CmsSaveBar
        isDirty={isDirty}
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={onSave}
        onResetDefaults={onResetDefaults}
        saveLabel="Save FAQ Section"
      />
    </div>
  );
}
