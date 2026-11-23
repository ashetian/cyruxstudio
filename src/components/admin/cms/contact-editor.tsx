"use client";

import React from "react";
import {
  BilingualField,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  TextField,
  ToggleRow,
} from "./cms-field-primitives";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"contact">) {
  const isEmailValid = EMAIL_PATTERN.test(value.supportEmail.trim());

  const handleSocialChange = (
    platform: "instagram" | "twitter" | "tiktok",
    url: string
  ) => {
    onChange({
      ...value,
      socialLinks: {
        ...value.socialLinks,
        [platform]: url,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Contact Section Visibility & Copy"
        description="Manage storefront contact section visibility, eyebrow, and concise concierge intro."
      >
        <ToggleRow
          label="Enable Contact Section"
          description="Display atelier contact details and inquiry channels on the storefront"
          checked={value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
          enabledText="Enabled"
          disabledText="Hidden"
        />

        <BilingualField
          label="Contact Eyebrow"
          value={value.eyebrow}
          onChange={(eyebrow) => onChange({ ...value, eyebrow })}
        />

        <BilingualField
          label="Contact Title"
          value={value.title}
          onChange={(title) => onChange({ ...value, title })}
        />

        <BilingualField
          label="Contact Subtitle"
          value={value.subtitle}
          onChange={(subtitle) => onChange({ ...value, subtitle })}
          multiline
          rows={2}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Atelier Email, Phone & Studio Hours"
        description="Configure concierge email, WhatsApp contact line, physical studio address, and working hours."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <TextField
              label="Support email"
              type="email"
              value={value.supportEmail}
              onChange={(supportEmail) => onChange({ ...value, supportEmail })}
              placeholder="contact@cyruxstudio.com"
              maxLength={255}
              required
              mono
            />
            {!isEmailValid && (
              <span className="text-xs text-red-700">
                Please enter a valid email address before saving.
              </span>
            )}
          </div>

          <TextField
            label="WhatsApp phone number (E.164)"
            type="tel"
            inputMode="tel"
            value={value.whatsappNumber}
            onChange={(whatsappNumber) =>
              onChange({ ...value, whatsappNumber })
            }
            placeholder="+905338737712"
            maxLength={40}
            mono
          />
        </div>

        <TextField
          label="Formatted WhatsApp display label"
          value={value.whatsappFormatted}
          onChange={(whatsappFormatted) =>
            onChange({ ...value, whatsappFormatted })
          }
          placeholder="+90 (533) 873 77 12"
          maxLength={60}
          mono
        />

        <BilingualField
          label="Default WhatsApp inquiry message"
          value={value.whatsappDefaultMessage}
          onChange={(whatsappDefaultMessage) =>
            onChange({ ...value, whatsappDefaultMessage })
          }
          multiline
          rows={2}
        />

        <BilingualField
          label="Atelier address"
          value={value.atelierAddress}
          onChange={(atelierAddress) => onChange({ ...value, atelierAddress })}
        />

        <BilingualField
          label="Working hours"
          value={value.workingHours}
          onChange={(workingHours) => onChange({ ...value, workingHours })}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Social Media Channels"
        description="Official brand social URLs rendered in Contact and Footer links."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="Instagram URL"
            type="url"
            value={value.socialLinks.instagram}
            onChange={(url) => handleSocialChange("instagram", url)}
            placeholder="https://instagram.com/cyruxstudio"
            mono
          />
          <TextField
            label="Twitter / X URL"
            type="url"
            value={value.socialLinks.twitter}
            onChange={(url) => handleSocialChange("twitter", url)}
            placeholder="https://x.com/cyruxstudio"
            mono
          />
          <TextField
            label="TikTok URL"
            type="url"
            value={value.socialLinks.tiktok}
            onChange={(url) => handleSocialChange("tiktok", url)}
            placeholder="https://tiktok.com/@cyruxstudio"
            mono
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
        saveLabel="Save Contact Section"
      />
    </div>
  );
}
