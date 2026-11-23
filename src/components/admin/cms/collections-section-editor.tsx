"use client";

import React from "react";
import {
  BilingualField,
  ChipListEditor,
  CmsSaveBar,
  CmsSectionCard,
  type CmsSectionEditorProps,
  TextField,
} from "./cms-field-primitives";

export function CollectionsSectionEditor({
  value,
  onChange,
  onSave,
  onResetDefaults,
  saving,
  isDirty,
  savedAt,
  error,
}: CmsSectionEditorProps<"collectionsSection">) {
  const updateProductDefaults = (
    patch: Partial<typeof value.productDetailsDefaults>
  ) => {
    onChange({
      ...value,
      productDetailsDefaults: {
        ...value.productDetailsDefaults,
        ...patch,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <CmsSectionCard
        title="Catalog & Bestseller Headings"
        description="Dynamic headings, subtitles, and card CTA labels for homepage product grids."
      >
        <BilingualField
          label="Bestseller Section Title"
          value={value.bestsellerTitle}
          onChange={(bestsellerTitle) => onChange({ ...value, bestsellerTitle })}
        />
        <BilingualField
          label="Bestseller Subtitle"
          value={value.bestsellerSubtitle}
          onChange={(bestsellerSubtitle) =>
            onChange({ ...value, bestsellerSubtitle })
          }
        />
        <BilingualField
          label="Featured Collections Title"
          value={value.featuredTitle}
          onChange={(featuredTitle) => onChange({ ...value, featuredTitle })}
        />
        <BilingualField
          label="Featured Collections Subtitle"
          value={value.featuredSubtitle}
          onChange={(featuredSubtitle) =>
            onChange({ ...value, featuredSubtitle })
          }
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Product Card Labels & CTAs"
        description="Customize card badges, out-of-stock status, and action labels."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BilingualField
            label="Explore CTA"
            value={value.exploreCta}
            onChange={(exploreCta) => onChange({ ...value, exploreCta })}
          />
          <BilingualField
            label="See Drop CTA"
            value={value.seeDropCta}
            onChange={(seeDropCta) => onChange({ ...value, seeDropCta })}
          />
          <BilingualField
            label="Sold Out Label"
            value={value.soldOutLabel}
            onChange={(soldOutLabel) => onChange({ ...value, soldOutLabel })}
          />
          <BilingualField
            label="Card Provenance Tag"
            value={value.cardProvenanceTag}
            onChange={(cardProvenanceTag) =>
              onChange({ ...value, cardProvenanceTag })
            }
          />
        </div>
      </CmsSectionCard>

      <CmsSectionCard
        title="Search Modal Popular Tags"
        description="Quick search chips displayed in the storefront search overlay."
      >
        <ChipListEditor
          label="Popular Search Tags"
          items={value.popularSearchTags}
          onChange={(popularSearchTags) =>
            onChange({ ...value, popularSearchTags })
          }
          placeholder="Add tag (e.g. Hoodie, Serigraphy)..."
          maxItems={20}
          maxLength={60}
        />
      </CmsSectionCard>

      <CmsSectionCard
        title="Product Detail Default Specifications"
        description="Fallback provenance, garment specs, and dispatch notes on product pages."
      >
        <BilingualField
          label="Provenance Tag"
          value={value.productDetailsDefaults.provenanceTag}
          onChange={(provenanceTag) => updateProductDefaults({ provenanceTag })}
        />
        <BilingualField
          label="VAT & Dispatch Label"
          value={value.productDetailsDefaults.vatDispatchLabel}
          onChange={(vatDispatchLabel) =>
            updateProductDefaults({ vatDispatchLabel })
          }
        />
        <BilingualField
          label="Sizing & Fit Label"
          value={value.productDetailsDefaults.fitLabel}
          onChange={(fitLabel) => updateProductDefaults({ fitLabel })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Fabric Specification"
            value={value.productDetailsDefaults.fabric}
            onChange={(fabric) => updateProductDefaults({ fabric })}
            maxLength={160}
          />
          <TextField
            label="Fit Specification"
            value={value.productDetailsDefaults.fit}
            onChange={(fit) => updateProductDefaults({ fit })}
            maxLength={160}
          />
          <TextField
            label="Print Technique"
            value={value.productDetailsDefaults.printTechnique}
            onChange={(printTechnique) =>
              updateProductDefaults({ printTechnique })
            }
            maxLength={160}
          />
          <TextField
            label="Edition Label"
            value={value.productDetailsDefaults.edition}
            onChange={(edition) => updateProductDefaults({ edition })}
            maxLength={160}
          />
        </div>

        <BilingualField
          label="Shipping Note"
          value={value.productDetailsDefaults.shippingNote}
          onChange={(shippingNote) => updateProductDefaults({ shippingNote })}
          multiline
          rows={2}
        />
      </CmsSectionCard>

      <CmsSaveBar
        isDirty={isDirty}
        saving={saving}
        savedAt={savedAt}
        error={error}
        onSave={onSave}
        onResetDefaults={onResetDefaults}
        saveLabel="Save Collections Section"
      />
    </div>
  );
}
