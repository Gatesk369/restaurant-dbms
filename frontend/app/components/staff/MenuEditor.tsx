import type { FormEvent } from "react";

import { Button } from "~/components/ui/Button";
import { Field, FieldError, Input, Select } from "~/components/ui/Field";
import { Panel } from "~/components/ui/Panel";
import { MENU_CATEGORIES, type MenuCategory } from "~/lib/api/types";
import { NAME_ERROR, PRICE_ERROR } from "~/lib/validation";
import { placeholderImage } from "~/lib/domain/station";

/** Shown instead of the form while nothing is being edited. */
export function MenuEditorPlaceholder() {
  return (
    <Panel as="div" pad="lg">
      <h2 className="m-0 text-panel font-normal">Item details</h2>
      <p className="m-0 text-body tracking-body text-moss">
        Choose Edit on a row to change an item, or use Add item to create a new one.
      </p>
    </Panel>
  );
}

interface MenuEditorProps {
  title: string;
  name: string;
  onName: (value: string) => void;
  category: MenuCategory;
  onCategory: (value: MenuCategory) => void;
  price: string;
  onPrice: (value: string) => void;
  available: boolean;
  onAvailable: (value: boolean) => void;
  imageUrl: string;
  onImageUrl: (value: string) => void;
  imageUrlError: string | null;

  nameInvalid: boolean;
  priceInvalid: boolean;
  /** The API does not store categories yet (gap G5): say so under the field. */
  categoryNotSaved: boolean;

  saving: boolean;
  disabled?: boolean;
  /** Server-side failure. */
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Add or edit one item. Validation shows inline after the first attempt. */
export function MenuEditor({
  title,
  name,
  onName,
  category,
  onCategory,
  price,
  onPrice,
  available,
  onAvailable,
  imageUrl,
  onImageUrl,
  imageUrlError,
  nameInvalid,
  priceInvalid,
  categoryNotSaved,
  saving,
  disabled = false,
  error,
  onSubmit,
  onCancel,
}: MenuEditorProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Panel as="form" pad="lg" gap="md" noValidate onSubmit={submit}>
      <fieldset disabled={saving || disabled} className="contents">
        <h2 className="m-0 text-panel font-normal">{title}</h2>

        <Field label="Item name" error={nameInvalid ? NAME_ERROR : null}>
          <Input value={name} onChange={(e) => onName(e.target.value)} />
        </Field>

        <Field
          label="Category"
          hint={
            categoryNotSaved ? "Categories are not stored yet, so this choice is not saved." : null
          }
        >
          <Select value={category} onChange={(e) => onCategory(e.target.value as MenuCategory)}>
            {MENU_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Price (UGX)"
          error={priceInvalid ? PRICE_ERROR : null}
          hint="The database also checks this, so a zero or negative price is rejected there too."
        >
          <Input
            inputMode="numeric"
            placeholder="For example: 18000"
            value={price}
            onChange={(e) => onPrice(e.target.value)}
          />
        </Field>

        <Field
          label="Item image URL"
          error={imageUrlError}
          hint="Paste an HTTPS image URL from the configured Cloudinary account. Leave blank for the placeholder."
        >
          <Input
            type="url"
            placeholder="https://res.cloudinary.com/…"
            value={imageUrl}
            onChange={(e) => onImageUrl(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3">
          <img
            src={imageUrl.trim() || placeholderImage(name || "Menu item")}
            onError={(event) => {
              const image = event.currentTarget;
              const fallback = placeholderImage(name || "Menu item");
              if (image.src !== fallback) image.src = fallback;
            }}
            alt={imageUrl.trim() ? `${name || "Menu item"} preview` : "Menu image placeholder"}
            width={120}
            height={72}
            className="h-[72px] w-[120px] rounded-md bg-field object-cover"
          />
          {imageUrl.trim() ? (
            <Button variant="tonal" onClick={() => onImageUrl("")}>
              Remove image
            </Button>
          ) : (
            <span className="text-label tracking-caption text-moss">
              Placeholder shown on the station
            </span>
          )}
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body font-bold tracking-bold">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => onAvailable(e.target.checked)}
            className="m-0 size-5 accent-moss"
          />
          Available for ordering today
        </label>

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            pending={saving}
            pendingLabel="Saving item…"
            className="min-h-12 min-w-[140px]"
          >
            Save item
          </Button>
          <Button variant="tonal" className="min-h-12" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </fieldset>
    </Panel>
  );
}
