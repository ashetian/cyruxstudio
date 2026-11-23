"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type {
  NavigationDrawerLinkCms,
  NavigationFloatingItemCms,
} from "@/lib/cms";
import {
  ATELIER_BTN_PRIMARY,
  ArrayItemCard,
  BilingualField,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  TextField,
  ToggleRow,
  moveArrayItem,
} from "./cms-field-primitives";

export function NavigationEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"navigation">) {
  const [expandedFloatingIdx, setExpandedFloatingIdx] = useState<number | null>(
    0
  );
  const [expandedDrawerIdx, setExpandedDrawerIdx] = useState<number | null>(0);

  const handleAddFloating = () => {
    if (value.floatingItems.length >= 10) return;
    const newItem: NavigationFloatingItemCms = {
      id: `fnav-${Date.now()}`,
      label: { tr: "Yeni Bağlantı", en: "New Link" },
      href: "/shop",
      isBrand: false,
    };
    const next = [...value.floatingItems, newItem];
    onChange({ ...value, floatingItems: next });
    setExpandedFloatingIdx(next.length - 1);
  };

  const handleUpdateFloating = (
    idx: number,
    patch: Partial<NavigationFloatingItemCms>
  ) => {
    const next = value.floatingItems.map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );
    onChange({ ...value, floatingItems: next });
  };

  const handleMoveFloating = (fromIndex: number, toIndex: number) => {
    const next = moveArrayItem(value.floatingItems, fromIndex, toIndex);
    onChange({ ...value, floatingItems: next });
    setExpandedFloatingIdx(toIndex);
  };

  const handleRemoveFloating = (idx: number) => {
    const next = value.floatingItems.filter((_, i) => i !== idx);
    onChange({ ...value, floatingItems: next });
    setExpandedFloatingIdx(null);
  };

  const handleAddDrawerLink = () => {
    if (value.drawerLinks.length >= 16) return;
    const newItem: NavigationDrawerLinkCms = {
      id: `dnav-${Date.now()}`,
      label: { tr: "YENİ SAYFA", en: "NEW PAGE" },
      href: "/shop",
    };
    const next = [...value.drawerLinks, newItem];
    onChange({ ...value, drawerLinks: next });
    setExpandedDrawerIdx(next.length - 1);
  };

  const handleUpdateDrawerLink = (
    idx: number,
    patch: Partial<NavigationDrawerLinkCms>
  ) => {
    const next = value.drawerLinks.map((item, i) =>
      i === idx ? { ...item, ...patch } : item
    );
    onChange({ ...value, drawerLinks: next });
  };

  const handleMoveDrawerLink = (fromIndex: number, toIndex: number) => {
    const next = moveArrayItem(value.drawerLinks, fromIndex, toIndex);
    onChange({ ...value, drawerLinks: next });
    setExpandedDrawerIdx(toIndex);
  };

  const handleRemoveDrawerLink = (idx: number) => {
    const next = value.drawerLinks.filter((_, i) => i !== idx);
    onChange({ ...value, drawerLinks: next });
    setExpandedDrawerIdx(null);
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Floating Bottom Pill Links"
        badge={`${value.floatingItems.length} / 10`}
        description="Manage floating nav links displayed in the bottom frosted storefront pill."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#525252]">
            Configure floating pill links and brand mark behavior.
          </span>
          <button
            type="button"
            onClick={handleAddFloating}
            disabled={value.floatingItems.length >= 10}
            className={`min-h-[44px] ${ATELIER_BTN_PRIMARY}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Floating Link</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {value.floatingItems.map((item, idx) => (
            <ArrayItemCard
              key={item.id || `fnav-${idx}`}
              index={idx}
              total={value.floatingItems.length}
              title={item.label.en || item.label.tr || `Pill Item ${idx + 1}`}
              subtitle={`${item.href}${item.isBrand ? " • Brand Pill" : ""}`}
              isExpanded={expandedFloatingIdx === idx}
              onToggleExpand={() =>
                setExpandedFloatingIdx(expandedFloatingIdx === idx ? null : idx)
              }
              onMoveUp={() => handleMoveFloating(idx, idx - 1)}
              onMoveDown={() => handleMoveFloating(idx, idx + 1)}
              onRemove={() => handleRemoveFloating(idx)}
            >
              <BilingualField
                label="Pill Label"
                value={item.label}
                onChange={(label) => handleUpdateFloating(idx, { label })}
              />
              <TextField
                label="Target Href"
                value={item.href}
                onChange={(href) => handleUpdateFloating(idx, { href })}
                placeholder="#shop or /shop"
                mono
              />
              <ToggleRow
                label="Primary Brand Pill"
                description="Render this item as the bold brand anchor inside the floating bar"
                checked={item.isBrand}
                onChange={(isBrand) => handleUpdateFloating(idx, { isBrand })}
                enabledText="Brand"
                disabledText="Standard"
              />
            </ArrayItemCard>
          ))}
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Menu Drawer Links & Footer Stamp"
        badge={`${value.drawerLinks.length} / 16`}
        description="Configure slide-out drawer links and bottom stamp copy."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#525252]">
            Manage full-screen / slide-out drawer navigation links.
          </span>
          <button
            type="button"
            onClick={handleAddDrawerLink}
            disabled={value.drawerLinks.length >= 16}
            className={ATELIER_BTN_PRIMARY}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Drawer Link</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {value.drawerLinks.map((item, idx) => (
            <ArrayItemCard
              key={item.id || `dnav-${idx}`}
              index={idx}
              total={value.drawerLinks.length}
              title={item.label.en || item.label.tr || `Drawer Link ${idx + 1}`}
              subtitle={item.href}
              isExpanded={expandedDrawerIdx === idx}
              onToggleExpand={() =>
                setExpandedDrawerIdx(expandedDrawerIdx === idx ? null : idx)
              }
              onMoveUp={() => handleMoveDrawerLink(idx, idx - 1)}
              onMoveDown={() => handleMoveDrawerLink(idx, idx + 1)}
              onRemove={() => handleRemoveDrawerLink(idx)}
            >
              <BilingualField
                label="Drawer Link Label"
                value={item.label}
                onChange={(label) => handleUpdateDrawerLink(idx, { label })}
              />
              <TextField
                label="Destination Href"
                value={item.href}
                onChange={(href) => handleUpdateDrawerLink(idx, { href })}
                placeholder="/shop"
                mono
              />
            </ArrayItemCard>
          ))}
        </div>

        <div className="pt-2 border-t border-[#E8E4DC]">
          <BilingualField
            label="Drawer Footer Stamp"
            value={value.drawerFooterStamp}
            onChange={(drawerFooterStamp) =>
              onChange({ ...value, drawerFooterStamp })
            }
          />
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="404 Not Found Page Copy"
        description="Dynamic bilingual messaging shown on unknown storefront routes."
      >
        <BilingualField
          label="404 Eyebrow"
          value={value.notFoundEyebrow}
          onChange={(notFoundEyebrow) =>
            onChange({ ...value, notFoundEyebrow })
          }
        />
        <BilingualField
          label="404 Title"
          value={value.notFoundTitle}
          onChange={(notFoundTitle) => onChange({ ...value, notFoundTitle })}
        />
        <BilingualField
          label="404 Body"
          value={value.notFoundBody}
          onChange={(notFoundBody) => onChange({ ...value, notFoundBody })}
          multiline
          rows={2}
        />
        <BilingualField
          label="404 Return CTA"
          value={value.notFoundCta}
          onChange={(notFoundCta) => onChange({ ...value, notFoundCta })}
        />
      </CmsSectionCard>

      <CmsSaveBar
        isDirty={isDirty}
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={onSave}
        onResetDefaults={onResetDefaults}
        saveLabel="Save Navigation Section"
      />
    </div>
  );
}
