"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { BilingualText, CmsSectionKey, StorefrontCmsConfig } from "@/lib/cms";
import { AdminBottomSheet } from "@/components/admin/admin-bottom-sheet";
import { BlobUploader } from "@/components/admin/blob-uploader";

export const ATELIER_INPUT_CLASS =
  "w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2.5 rounded-none placeholder:text-[#737373]";

export const ATELIER_TEXTAREA_CLASS =
  "w-full min-h-[88px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs p-3 rounded-none placeholder:text-[#737373]";

export const ATELIER_SELECT_CLASS =
  "w-full min-h-[44px] bg-[#FFFFFF] border border-[#E8E4DC] focus:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] text-[#0A0A0A] text-base md:text-xs px-3 py-2.5 rounded-none cursor-pointer";

export const ATELIER_LABEL_CLASS =
  "block text-[11px] font-semibold uppercase tracking-wider text-[#525252]";

export const ATELIER_CARD_CLASS =
  "bg-[#FFFFFF] border border-[#E8E4DC] p-4 sm:p-5 flex flex-col gap-4 min-w-0";

export const ATELIER_BTN_PRIMARY =
  "min-h-[44px] px-4 py-2.5 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#262626] border border-[#0A0A0A] text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]";

export const ATELIER_BTN_SECONDARY =
  "min-h-[44px] px-3.5 py-2 bg-[#FFFFFF] text-[#0A0A0A] hover:border-[#0A0A0A] border border-[#E8E4DC] text-xs font-medium uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]";

export const ATELIER_BTN_ICON =
  "min-h-[44px] min-w-[44px] bg-[#FFFFFF] text-[#0A0A0A] hover:border-[#0A0A0A] border border-[#E8E4DC] inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]";

export interface CmsSectionEditorProps<K extends CmsSectionKey> {
  value: StorefrontCmsConfig[K];
  onChange: (next: StorefrontCmsConfig[K]) => void;
  onSave: () => void;
  onResetDefaults?: () => void;
  saving: boolean;
  isDirty: boolean;
  savedAt: string | null;
  error: string | null;
}

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved !== undefined) {
    next.splice(toIndex, 0, moved);
  }
  return next;
}

export interface CmsSectionCardProps {
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}

export function CmsSectionCard({
  title,
  description,
  badge,
  children,
}: CmsSectionCardProps) {
  return (
    <section className={ATELIER_CARD_CLASS}>
      <div className="pb-3 border-b border-[#E8E4DC] flex flex-wrap items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-[#525252] mt-1">{description}</p>
          )}
        </div>
        {badge && (
          <span className="shrink-0 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider bg-[#FAF8F3] border border-[#E8E4DC] text-[#525252]">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4 min-w-0">{children}</div>
    </section>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: "text" | "email" | "url" | "number" | "tel";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  mono?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number | string;
  required?: boolean;
  helper?: string;
}

export function TextField({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  type = "text",
  inputMode,
  mono = false,
  maxLength,
  min,
  max,
  step,
  required = false,
  helper,
}: TextFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className={ATELIER_LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        required={required}
        className={`${ATELIER_INPUT_CLASS} ${mono ? "font-mono" : ""}`}
      />
      {helper && <p className="text-[11px] text-[#525252]">{helper}</p>}
    </div>
  );
}

export interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  mono?: boolean;
  helper?: string;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  mono = false,
  helper,
}: TextAreaFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className={ATELIER_LABEL_CLASS}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`${ATELIER_TEXTAREA_CLASS} ${mono ? "font-mono" : ""}`}
      />
      {helper && <p className="text-[11px] text-[#525252]">{helper}</p>}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  helper?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  helper,
}: SelectFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className={ATELIER_LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={ATELIER_SELECT_CLASS}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helper && <p className="text-[11px] text-[#525252]">{helper}</p>}
    </div>
  );
}

export interface BilingualFieldProps {
  label: string;
  value: BilingualText;
  onChange: (next: BilingualText) => void;
  multiline?: boolean;
  rows?: number;
  placeholderTr?: string;
  placeholderEn?: string;
  maxLength?: number;
  helper?: string;
}

export function BilingualField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholderTr,
  placeholderEn,
  maxLength,
  helper,
}: BilingualFieldProps) {
  const trId = useId();
  const enId = useId();

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={ATELIER_LABEL_CLASS}>{label}</span>
        <span className="text-[11px] font-mono uppercase text-[#525252]">
          TR / EN
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={trId}
            className="text-[11px] font-medium text-[#525252]"
          >
            Turkish (tr)
          </label>
          {multiline ? (
            <textarea
              id={trId}
              rows={rows}
              value={value.tr}
              onChange={(e) => onChange({ ...value, tr: e.target.value })}
              placeholder={placeholderTr}
              maxLength={maxLength}
              className={ATELIER_TEXTAREA_CLASS}
            />
          ) : (
            <input
              id={trId}
              type="text"
              value={value.tr}
              onChange={(e) => onChange({ ...value, tr: e.target.value })}
              placeholder={placeholderTr}
              maxLength={maxLength}
              className={ATELIER_INPUT_CLASS}
            />
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={enId}
            className="text-[11px] font-medium text-[#525252]"
          >
            English (en)
          </label>
          {multiline ? (
            <textarea
              id={enId}
              rows={rows}
              value={value.en}
              onChange={(e) => onChange({ ...value, en: e.target.value })}
              placeholder={placeholderEn}
              maxLength={maxLength}
              className={ATELIER_TEXTAREA_CLASS}
            />
          ) : (
            <input
              id={enId}
              type="text"
              value={value.en}
              onChange={(e) => onChange({ ...value, en: e.target.value })}
              placeholder={placeholderEn}
              maxLength={maxLength}
              className={ATELIER_INPUT_CLASS}
            />
          )}
        </div>
      </div>

      {helper && <p className="text-[11px] text-[#525252]">{helper}</p>}
    </div>
  );
}

export interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  enabledText?: string;
  disabledText?: string;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  enabledText = "Visible",
  disabledText = "Hidden",
}: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#FAF8F3] border border-[#E8E4DC] hover:border-[#0A0A0A] text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-[#0A0A0A]">{label}</div>
        {description && (
          <div className="text-[11px] text-[#525252] mt-0.5">{description}</div>
        )}
      </div>

      <span
        className={`shrink-0 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border ${
          checked
            ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
            : "bg-[#FFFFFF] text-[#525252] border-[#E8E4DC]"
        }`}
      >
        {checked ? enabledText : disabledText}
      </span>
    </button>
  );
}

export interface ChipListEditorProps {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
  helper?: string;
}

export function ChipListEditor({
  label,
  items,
  onChange,
  placeholder = "Add keyword...",
  maxItems = 20,
  maxLength = 60,
  helper,
}: ChipListEditorProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (items.length >= maxItems) return;
    if (items.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...items, trimmed]);
    setDraft("");
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className={ATELIER_LABEL_CLASS}>
          {label}
        </label>
        <span className="text-[11px] font-mono text-[#525252]">
          {items.length} / {maxItems}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 min-w-0">
        <input
          id={inputId}
          type="text"
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className={`${ATELIER_INPUT_CLASS} flex-1 min-w-0`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.trim() || items.length >= maxItems}
          className={`${ATELIER_BTN_PRIMARY} shrink-0`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {items.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="inline-flex items-center bg-[#FAF8F3] border border-[#E8E4DC] pl-3 pr-1 min-h-[44px] max-w-full"
            >
              <span className="text-xs font-mono text-[#0A0A0A] truncate">
                {item}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label={`Remove ${item}`}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#525252] hover:text-[#0A0A0A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {helper && <p className="text-[11px] text-[#525252]">{helper}</p>}
    </div>
  );
}

export interface ArrayItemCardProps {
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disableRemove?: boolean;
  children: React.ReactNode;
}

export function ArrayItemCard({
  index,
  total,
  title,
  subtitle,
  isExpanded,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableRemove = false,
  children,
}: ArrayItemCardProps) {
  return (
    <div className="bg-[#FAF8F3] border border-[#E8E4DC] min-w-0">
      <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="flex-1 min-h-[44px] px-2 flex items-center justify-between gap-2 text-left min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#0A0A0A] truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-[11px] text-[#525252] truncate">
                {subtitle}
              </div>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 shrink-0 text-[#525252]" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0 text-[#525252]" />
          )}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Move item ${index + 1} up`}
            className={ATELIER_BTN_ICON}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index >= total - 1}
            aria-label={`Move item ${index + 1} down`}
            className={ATELIER_BTN_ICON}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={disableRemove}
            aria-label={`Delete item ${index + 1}`}
            className="min-h-[44px] min-w-[44px] bg-[#FFFFFF] text-red-700 hover:border-red-700 border border-[#E8E4DC] inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-4 border-t border-[#E8E4DC] bg-[#FFFFFF] flex flex-col gap-4 min-w-0">
          {children}
        </div>
      )}
    </div>
  );
}

interface BlobAssetEntry {
  url: string;
  pathname: string;
  size: number;
  contentType?: string;
}

function isVideoAssetUrl(url: string, contentType?: string): boolean {
  if (contentType && contentType.startsWith("video/")) return true;
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

export interface MediaFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  mediaType?: "image" | "video" | "any";
  defaultValue?: string;
  aspectHint?: string;
  helper?: string;
}

export function MediaField({
  label,
  value,
  onChange,
  mediaType = "image",
  defaultValue,
  aspectHint,
  helper,
}: MediaFieldProps) {
  const inputId = useId();
  const [showUploader, setShowUploader] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [blobs, setBlobs] = useState<BlobAssetEntry[]>([]);
  const [loadingBlobs, setLoadingBlobs] = useState(false);
  const [blobError, setBlobError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "images" | "videos">(
    mediaType === "video" ? "videos" : mediaType === "image" ? "images" : "all"
  );
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [value]);

  const loadLibrary = useCallback(async () => {
    setLoadingBlobs(true);
    setBlobError(null);
    try {
      const res = await fetch("/api/admin/blob");
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        blobs?: BlobAssetEntry[];
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load media library");
      }
      setBlobs(Array.isArray(data.blobs) ? data.blobs : []);
    } catch (err: unknown) {
      setBlobError(
        err instanceof Error ? err.message : "Failed to fetch media library"
      );
    } finally {
      setLoadingBlobs(false);
    }
  }, []);

  const openLibrary = () => {
    setPickerOpen(true);
    void loadLibrary();
  };

  const filteredBlobs = blobs.filter((blob) => {
    const isVideo = isVideoAssetUrl(blob.url, blob.contentType);
    if (filterMode === "images") return !isVideo;
    if (filterMode === "videos") return isVideo;
    return true;
  });

  const renderVideo = mediaType === "video" || isVideoAssetUrl(value);

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-[#FAF8F3] border border-[#E8E4DC] min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <label htmlFor={inputId} className={ATELIER_LABEL_CLASS}>
          {label}
        </label>
        {aspectHint && (
          <span className="text-[11px] font-mono text-[#525252]">
            {aspectHint}
          </span>
        )}
      </div>

      <div className="relative w-full h-36 sm:h-44 bg-[#FFFFFF] border border-[#E8E4DC] overflow-hidden flex items-center justify-center">
        {!value.trim() || previewFailed ? (
          <div className="flex flex-col items-center gap-1.5 text-[#525252] px-4 text-center">
            {mediaType === "video" ? (
              <Video className="w-5 h-5" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
            <span className="text-xs">
              {value.trim() ? "Preview unavailable" : "No media selected"}
            </span>
          </div>
        ) : renderVideo ? (
          <video
            src={value}
            controls
            muted
            playsInline
            onError={() => setPreviewFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={value}
            alt={label}
            onError={() => setPreviewFailed(true)}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <input
        id={inputId}
        type="text"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/assets/editorial/hero-desktop.jpg"
        className={`${ATELIER_INPUT_CLASS} font-mono`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowUploader((prev) => !prev)}
          className={ATELIER_BTN_SECONDARY}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{showUploader ? "Close Upload" : "Upload Asset"}</span>
        </button>

        <button
          type="button"
          onClick={openLibrary}
          className={ATELIER_BTN_SECONDARY}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Media Library</span>
        </button>

        {defaultValue !== undefined ? (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className={ATELIER_BTN_SECONDARY}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        ) : (
          value.trim() !== "" && (
            <button
              type="button"
              onClick={() => onChange("")}
              className={ATELIER_BTN_SECONDARY}
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )
        )}
      </div>

      {showUploader && (
        <div className="pt-1">
          <BlobUploader
            compact
            onUploadSuccess={(result) => {
              onChange(result.url);
              setShowUploader(false);
            }}
          />
        </div>
      )}

      {helper && <p className="text-[11px] text-[#525252]">{helper}</p>}

      <AdminBottomSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select Media Asset"
        subtitle="Choose an uploaded image or video from Vercel Blob storage"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "images", "videos"] as const).map((mode) => {
              const active = filterMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`min-h-[44px] px-3.5 py-2 text-xs font-medium uppercase tracking-wider border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                    active
                      ? "bg-[#0A0A0A] text-[#FFFFFF] border-[#0A0A0A]"
                      : "bg-[#FFFFFF] text-[#0A0A0A] border-[#E8E4DC] hover:border-[#0A0A0A]"
                  }`}
                >
                  {mode}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => void loadLibrary()}
              className={`${ATELIER_BTN_SECONDARY} ml-auto`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {blobError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-300 text-red-900 text-xs p-3"
            >
              {blobError}
            </div>
          )}

          {loadingBlobs ? (
            <div className="py-10 text-center text-xs text-[#525252]">
              Loading media library...
            </div>
          ) : filteredBlobs.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#525252] bg-[#FAF8F3] border border-[#E8E4DC] p-4">
              No media assets found in this filter. Upload a new asset above.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredBlobs.map((blob) => {
                const isVideo = isVideoAssetUrl(blob.url, blob.contentType);
                const selected = blob.url === value;
                return (
                  <button
                    key={blob.url}
                    type="button"
                    onClick={() => {
                      onChange(blob.url);
                      setPickerOpen(false);
                    }}
                    className={`min-h-[44px] flex flex-col border text-left overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${
                      selected
                        ? "border-[#0A0A0A] ring-1 ring-[#0A0A0A] bg-[#FAF8F3]"
                        : "border-[#E8E4DC] hover:border-[#0A0A0A] bg-[#FFFFFF]"
                    }`}
                  >
                    <div className="w-full h-24 bg-[#FAF8F3] overflow-hidden flex items-center justify-center">
                      {isVideo ? (
                        <video
                          src={blob.url}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={blob.url}
                          alt={blob.pathname}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-2 min-w-0 w-full">
                      <div className="text-[11px] font-mono text-[#0A0A0A] truncate">
                        {blob.pathname.split("/").pop() || blob.pathname}
                      </div>
                      <div className="text-[10px] text-[#525252] mt-0.5">
                        {(blob.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </AdminBottomSheet>
    </div>
  );
}

export interface CmsSaveBarProps {
  isDirty: boolean;
  saving: boolean;
  savedAt: string | null;
  error: string | null;
  onSave: () => void;
  onResetDefaults?: () => void;
  saveLabel?: string;
}

export function CmsSaveBar({
  isDirty,
  saving,
  savedAt,
  error,
  onSave,
  onResetDefaults,
  saveLabel = "Save Section",
}: CmsSaveBarProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 text-xs p-3.5 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {savedAt && !error && !isDirty && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>Changes saved and published ({savedAt}).</span>
        </div>
      )}

      <div className="bg-[#FFFFFF] border border-[#E8E4DC] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#525252] min-w-0">
          {isDirty
            ? "You have unsaved changes in this section."
            : "Section content is synced with storefront."}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {onResetDefaults &&
            (confirmReset ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetDefaults();
                    setConfirmReset(false);
                  }}
                  className="min-h-[44px] px-3.5 py-2 bg-red-700 text-[#FFFFFF] border border-red-700 text-xs font-semibold uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  Confirm Restore
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className={ATELIER_BTN_SECONDARY}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className={ATELIER_BTN_SECONDARY}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Defaults</span>
              </button>
            ))}

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className={`${ATELIER_BTN_PRIMARY} w-full sm:w-auto min-w-[160px]`}
          >
            {saving ? "Saving..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
