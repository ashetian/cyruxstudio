"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { MarqueeItemCms } from "@/lib/cms";
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

export function MarqueeEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"marquee">) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleAddItem = () => {
    if (value.items.length >= 20) return;
    const newItem: MarqueeItemCms = {
      id: `mq-${Date.now()}`,
      text: { tr: "YENİ DUYURU", en: "NEW ANNOUNCEMENT" },
      href: "#shop",
    };
    const nextItems = [...value.items, newItem];
    onChange({ ...value, items: nextItems });
    setExpandedIndex(nextItems.length - 1);
  };

  const handleUpdateItem = (index: number, patch: Partial<MarqueeItemCms>) => {
    const nextItems = value.items.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    onChange({ ...value, items: nextItems });
  };

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    const nextItems = moveArrayItem(value.items, fromIndex, toIndex);
    onChange({ ...value, items: nextItems });
    setExpandedIndex(toIndex);
  };

  const handleRemoveItem = (index: number) => {
    const nextItems = value.items.filter((_, idx) => idx !== index);
    onChange({ ...value, items: nextItems });
    setExpandedIndex(null);
  };

  const clampedSpeed = Math.min(120, Math.max(8, value.speedSeconds || 28));
  const [speedDraft, setSpeedDraft] = useState<string>(() =>
    String(clampedSpeed)
  );
  const [speedFocused, setSpeedFocused] = useState(false);

  useEffect(() => {
    if (!speedFocused) {
      setSpeedDraft(String(clampedSpeed));
    }
  }, [clampedSpeed, speedFocused]);

  const handleSpeedBlur = () => {
    setSpeedFocused(false);
    const trimmed = speedDraft.trim();
    const parsed = trimmed === "" ? NaN : Number(trimmed);
    const nextSpeed = Number.isFinite(parsed)
      ? Math.min(120, Math.max(8, Math.round(parsed)))
      : clampedSpeed;
    setSpeedDraft(String(nextSpeed));
    if (nextSpeed !== value.speedSeconds) {
      onChange({ ...value, speedSeconds: nextSpeed });
    }
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Marquee Ticker Configuration"
        description="Control visibility, scroll speed (8 to 120 seconds), and hover pause behavior."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Enable Storefront Marquee Bar"
            description="Show the announcement ticker strip on the public storefront"
            checked={value.enabled}
            onChange={(enabled) => onChange({ ...value, enabled })}
            enabledText="Enabled"
            disabledText="Hidden"
          />
          <ToggleRow
            label="Pause Ticker on Hover"
            description="Slow or pause scrolling when customers hover links"
            checked={value.pauseOnHover}
            onChange={(pauseOnHover) => onChange({ ...value, pauseOnHover })}
            enabledText="Paused"
            disabledText="Continuous"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <TextField
            label="Scroll Duration (speedSeconds)"
            type="number"
            inputMode="numeric"
            min={8}
            max={120}
            value={speedDraft}
            onFocus={() => setSpeedFocused(true)}
            onBlur={handleSpeedBlur}
            onChange={(raw) => {
              setSpeedDraft(raw);
              if (raw.trim() === "") return;
              const parsed = Number(raw);
              if (Number.isFinite(parsed)) {
                const rounded = Math.round(parsed);
                if (rounded >= 8 && rounded <= 120) {
                  onChange({ ...value, speedSeconds: rounded });
                }
              }
            }}
            mono
            helper="Lower seconds = faster scroll loop (allowed: 8–120s)."
          />

          <div className="flex flex-col gap-2 min-w-0">
            <span className={ATELIER_LABEL_CLASS}>Speed Slider</span>
            <input
              type="range"
              min={8}
              max={120}
              value={clampedSpeed}
              onChange={(e) => {
                const nextSpeed = Number(e.target.value);
                setSpeedDraft(String(nextSpeed));
                onChange({ ...value, speedSeconds: nextSpeed });
              }}
              aria-label="Marquee speed slider"
              className="w-full min-h-[44px] accent-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
            />
          </div>
        </div>

        <div className="bg-[#FAF8F3] border border-[#E8E4DC] p-3 min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#525252] mb-1.5">
            Live Ticker Preview ({clampedSpeed}s loop)
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#0A0A0A] truncate">
            {value.items.length > 0
              ? value.items.map((item) => item.text.en || item.text.tr).join(" • ")
              : "No marquee items configured"}
          </div>
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Marquee Items"
        badge={`${value.items.length} / 20`}
        description="Add, reorder, and link bilingual announcement items."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#525252]">
            Tap any item to expand bilingual copy and destination link.
          </span>
          <button
            type="button"
            onClick={handleAddItem}
            disabled={value.items.length >= 20}
            className={ATELIER_BTN_PRIMARY}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Marquee Item</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {value.items.map((item, idx) => (
            <ArrayItemCard
              key={item.id || `mq-${idx}`}
              index={idx}
              total={value.items.length}
              title={item.text.en || item.text.tr || `Marquee Item ${idx + 1}`}
              subtitle={item.href || "No link"}
              isExpanded={expandedIndex === idx}
              onToggleExpand={() =>
                setExpandedIndex(expandedIndex === idx ? null : idx)
              }
              onMoveUp={() => handleMoveItem(idx, idx - 1)}
              onMoveDown={() => handleMoveItem(idx, idx + 1)}
              onRemove={() => handleRemoveItem(idx)}
            >
              <BilingualField
                label="Announcement Text"
                value={item.text}
                onChange={(text) => handleUpdateItem(idx, { text })}
              />
              <TextField
                label="Destination Link (Optional)"
                value={item.href ?? ""}
                onChange={(href) => handleUpdateItem(idx, { href })}
                placeholder="#shop or /shop"
                mono
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
        saveLabel="Save Marquee Section"
      />
    </div>
  );
}
