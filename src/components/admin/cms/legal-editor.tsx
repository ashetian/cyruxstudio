"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { LegalSectionItemCms, LegalTabCms } from "@/lib/cms";
import {
  ATELIER_BTN_PRIMARY,
  ArrayItemCard,
  BilingualField,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  TextField,
  moveArrayItem,
} from "./cms-field-primitives";

const TAB_LABELS: Record<LegalTabCms["id"], string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Use",
  shipping: "Shipping & Returns",
  sales: "Distance Sales",
};

export function LegalEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"legal">) {
  const [activeTabId, setActiveTabId] = useState<LegalTabCms["id"]>(
    value.tabs[0]?.id ?? "privacy"
  );
  const [expandedClauseIdx, setExpandedClauseIdx] = useState<number | null>(0);

  const activeTabIndex = value.tabs.findIndex((t) => t.id === activeTabId);
  const resolvedTabIndex = activeTabIndex >= 0 ? activeTabIndex : 0;
  const activeTab = value.tabs[resolvedTabIndex];

  const updateActiveTab = (patch: Partial<LegalTabCms>) => {
    if (!activeTab) return;
    const nextTabs = value.tabs.map((tab, idx) =>
      idx === resolvedTabIndex ? { ...tab, ...patch } : tab
    );
    onChange({ ...value, tabs: nextTabs });
  };

  const handleAddClause = () => {
    if (!activeTab || activeTab.sections.length >= 20) return;
    const nextNum = String(activeTab.sections.length + 1).padStart(2, "0");
    const newClause: LegalSectionItemCms = {
      index: nextNum,
      title: { tr: `${nextNum}. YENİ MADDE`, en: `${nextNum}. NEW CLAUSE` },
      body: {
        tr: "Yasal politika madde metni.",
        en: "Legal policy clause content.",
      },
    };
    const nextSections = [...activeTab.sections, newClause];
    updateActiveTab({ sections: nextSections });
    setExpandedClauseIdx(nextSections.length - 1);
  };

  const handleUpdateClause = (
    idx: number,
    patch: Partial<LegalSectionItemCms>
  ) => {
    if (!activeTab) return;
    const nextSections = activeTab.sections.map((clause, i) =>
      i === idx ? { ...clause, ...patch } : clause
    );
    updateActiveTab({ sections: nextSections });
  };

  const handleMoveClause = (fromIndex: number, toIndex: number) => {
    if (!activeTab) return;
    const nextSections = moveArrayItem(activeTab.sections, fromIndex, toIndex);
    updateActiveTab({ sections: nextSections });
    setExpandedClauseIdx(toIndex);
  };

  const handleRemoveClause = (idx: number) => {
    if (!activeTab) return;
    const nextSections = activeTab.sections.filter((_, i) => i !== idx);
    updateActiveTab({ sections: nextSections });
    setExpandedClauseIdx(null);
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Legal Modal & Page Header"
        description="Global header metadata for the Legal modal and /legal policy archive page."
      >
        <BilingualField
          label="Modal / Page Title"
          value={value.modalTitle}
          onChange={(modalTitle) => onChange({ ...value, modalTitle })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Archive Tag"
            value={value.archiveTag}
            onChange={(archiveTag) => onChange({ ...value, archiveTag })}
            maxLength={80}
            mono
          />
          <TextField
            label="Studio Location Stamp"
            value={value.studioLocation}
            onChange={(studioLocation) => onChange({ ...value, studioLocation })}
            maxLength={120}
          />
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Policy Documents (Privacy, Terms, Shipping, Sales)"
        description="Switch between the four legal documents and manage numbered bilingual clauses."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {value.tabs.map((tab) => {
            const active = tab.id === activeTab?.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTabId(tab.id);
                  setExpandedClauseIdx(0);
                }}
                className={`min-h-[44px] px-3 py-2 text-xs font-semibold uppercase tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                  active
                    ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                    : "bg-[#FAF8F3] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                }`}
              >
                {TAB_LABELS[tab.id] || tab.id}
              </button>
            );
          })}
        </div>

        {activeTab && (
          <div className="flex flex-col gap-4 pt-2 border-t border-[#E8E4DC]">
            <BilingualField
              label={`Document Label (${activeTab.id})`}
              value={activeTab.label}
              onChange={(label) => updateActiveTab({ label })}
            />
            <BilingualField
              label="Document Badge"
              value={activeTab.badge}
              onChange={(badge) => updateActiveTab({ badge })}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8E4DC]">
              <span className="text-xs text-[#525252]">
                Clauses in {TAB_LABELS[activeTab.id]} ({activeTab.sections.length}{" "}
                / 20)
              </span>
              <button
                type="button"
                onClick={handleAddClause}
                disabled={activeTab.sections.length >= 20}
                className={ATELIER_BTN_PRIMARY}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Clause</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {activeTab.sections.map((clause, idx) => (
                <ArrayItemCard
                  key={`${activeTab.id}-clause-${idx}`}
                  index={idx}
                  total={activeTab.sections.length}
                  title={
                    clause.title.en ||
                    clause.title.tr ||
                    `Clause ${idx + 1}`
                  }
                  subtitle={`Index: ${clause.index}`}
                  isExpanded={expandedClauseIdx === idx}
                  onToggleExpand={() =>
                    setExpandedClauseIdx(expandedClauseIdx === idx ? null : idx)
                  }
                  onMoveUp={() => handleMoveClause(idx, idx - 1)}
                  onMoveDown={() => handleMoveClause(idx, idx + 1)}
                  onRemove={() => handleRemoveClause(idx)}
                >
                  <TextField
                    label="Clause Index"
                    value={clause.index}
                    onChange={(index) => handleUpdateClause(idx, { index })}
                    maxLength={20}
                    mono
                  />
                  <BilingualField
                    label="Clause Title"
                    value={clause.title}
                    onChange={(title) => handleUpdateClause(idx, { title })}
                  />
                  <BilingualField
                    label="Clause Body"
                    value={clause.body}
                    onChange={(body) => handleUpdateClause(idx, { body })}
                    multiline
                    rows={4}
                  />
                </ArrayItemCard>
              ))}
            </div>
          </div>
        )}
      </CmsSectionCard>

      <CmsSaveBar
        isDirty={isDirty}
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={onSave}
        onResetDefaults={onResetDefaults}
        saveLabel="Save Legal Documents"
      />
    </div>
  );
}
