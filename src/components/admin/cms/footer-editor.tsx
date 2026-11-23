"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import {
  DEFAULT_STOREFRONT_CMS,
  type FooterNavRowCms,
} from "@/lib/cms";
import {
  ATELIER_BTN_PRIMARY,
  ArrayItemCard,
  BilingualField,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  MediaField,
  SelectField,
  TextField,
  moveArrayItem,
} from "./cms-field-primitives";

const ACTION_TYPE_OPTIONS = [
  { value: "scroll", label: "Scroll to Section" },
  { value: "route", label: "Internal Route" },
  { value: "whatsapp", label: "Open WhatsApp" },
  { value: "external", label: "External URL" },
];

export function FooterEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"footer">) {
  const defaults = DEFAULT_STOREFRONT_CMS.footer;
  const [expandedRowIdx, setExpandedRowIdx] = useState<number | null>(0);

  const handleAddRow = () => {
    if (value.navRows.length >= 12) return;
    const nextIndex = String(value.navRows.length + 1).padStart(2, "0");
    const newRow: FooterNavRowCms = {
      id: `frow-${Date.now()}`,
      index: nextIndex,
      label: { tr: "YENİ BAĞLANTI", en: "NEW LINK" },
      href: "/shop",
      actionType: "route",
    };
    const nextRows = [...value.navRows, newRow];
    onChange({ ...value, navRows: nextRows });
    setExpandedRowIdx(nextRows.length - 1);
  };

  const handleUpdateRow = (
    idx: number,
    patch: Partial<FooterNavRowCms>
  ) => {
    const nextRows = value.navRows.map((row, i) =>
      i === idx ? { ...row, ...patch } : row
    );
    onChange({ ...value, navRows: nextRows });
  };

  const handleMoveRow = (fromIndex: number, toIndex: number) => {
    const nextRows = moveArrayItem(value.navRows, fromIndex, toIndex);
    onChange({ ...value, navRows: nextRows });
    setExpandedRowIdx(toIndex);
  };

  const handleRemoveRow = (idx: number) => {
    const nextRows = value.navRows.filter((_, i) => i !== idx);
    onChange({ ...value, navRows: nextRows });
    setExpandedRowIdx(null);
  };

  const updateLegalLabel = (
    key: "privacy" | "terms" | "shipping" | "sales",
    nextLabel: { tr: string; en: string }
  ) => {
    onChange({
      ...value,
      legalLabels: {
        ...value.legalLabels,
        [key]: nextLabel,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Monumental Footer Navigation Rows"
        badge={`${value.navRows.length} / 12`}
        description="Configure the oversized footer index rows and their action behavior."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#525252]">
            Tap any row to edit bilingual label, index, action type, and href.
          </span>
          <button
            type="button"
            onClick={handleAddRow}
            disabled={value.navRows.length >= 12}
            className={`min-h-[44px] ${ATELIER_BTN_PRIMARY}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Footer Row</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {value.navRows.map((row, idx) => (
            <ArrayItemCard
              key={row.id || `frow-${idx}`}
              index={idx}
              total={value.navRows.length}
              title={`[${row.index || String(idx + 1).padStart(2, "0")}] ${
                row.label.en || row.label.tr || "Footer Row"
              }`}
              subtitle={`${row.actionType} • ${row.href}`}
              isExpanded={expandedRowIdx === idx}
              onToggleExpand={() =>
                setExpandedRowIdx(expandedRowIdx === idx ? null : idx)
              }
              onMoveUp={() => handleMoveRow(idx, idx - 1)}
              onMoveDown={() => handleMoveRow(idx, idx + 1)}
              onRemove={() => handleRemoveRow(idx)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Row Index"
                  value={row.index}
                  onChange={(index) => handleUpdateRow(idx, { index })}
                  maxLength={20}
                  mono
                  placeholder="01"
                />
                <SelectField
                  label="Action Type"
                  value={row.actionType}
                  onChange={(actionType) =>
                    handleUpdateRow(idx, {
                      actionType: actionType as FooterNavRowCms["actionType"],
                    })
                  }
                  options={ACTION_TYPE_OPTIONS}
                />
              </div>

              <BilingualField
                label="Row Label"
                value={row.label}
                onChange={(label) => handleUpdateRow(idx, { label })}
              />

              <TextField
                label="Destination Href"
                value={row.href}
                onChange={(href) => handleUpdateRow(idx, { href })}
                placeholder="#shop or /contact"
                mono
              />
            </ArrayItemCard>
          ))}
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Footer Emblem, Copyright & Credit Line"
        description="Manage footer logo artwork, copyright stamp, and atelier credit link."
      >
        <MediaField
          label="Footer Emblem Logo"
          value={value.logoUrl}
          onChange={(logoUrl) => onChange({ ...value, logoUrl })}
          mediaType="image"
          defaultValue={defaults.logoUrl}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Logo Alt Text"
            value={value.logoAlt}
            onChange={(logoAlt) => onChange({ ...value, logoAlt })}
            maxLength={120}
          />
          <TextField
            label="Copyright Text"
            value={value.copyrightText}
            onChange={(copyrightText) => onChange({ ...value, copyrightText })}
            maxLength={120}
            mono
          />
        </div>

        <BilingualField
          label="Rights Reserved Copy"
          value={value.rightsText}
          onChange={(rightsText) => onChange({ ...value, rightsText })}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E8E4DC]">
          <TextField
            label="Credit Prefix"
            value={value.creditPrefix}
            onChange={(creditPrefix) => onChange({ ...value, creditPrefix })}
            maxLength={60}
            placeholder="made with love by"
          />
          <TextField
            label="Credit Author"
            value={value.creditAuthor}
            onChange={(creditAuthor) => onChange({ ...value, creditAuthor })}
            maxLength={80}
            mono
          />
          <TextField
            label="Credit URL"
            type="url"
            value={value.creditUrl}
            onChange={(creditUrl) => onChange({ ...value, creditUrl })}
            mono
          />
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Footer Legal Trigger Labels"
        description="Bilingual labels for the four policy links in the footer bottom bar."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BilingualField
            label="Privacy Label"
            value={value.legalLabels.privacy}
            onChange={(next) => updateLegalLabel("privacy", next)}
          />
          <BilingualField
            label="Terms Label"
            value={value.legalLabels.terms}
            onChange={(next) => updateLegalLabel("terms", next)}
          />
          <BilingualField
            label="Shipping Label"
            value={value.legalLabels.shipping}
            onChange={(next) => updateLegalLabel("shipping", next)}
          />
          <BilingualField
            label="Sales Policy Label"
            value={value.legalLabels.sales}
            onChange={(next) => updateLegalLabel("sales", next)}
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
        saveLabel="Save Footer Section"
      />
    </div>
  );
}
