import type { ReactNode } from "react";

import { cx } from "~/lib/cx";
import { Icon } from "./Icon";

/**
 * role: sign-in role picker (min 60) · method: checkout payment method (64) ·
 * touch: station payment choice (72, larger type).
 */
export type RadioCardVariant = "role" | "method" | "touch";

const VARIANTS: Record<RadioCardVariant, string> = {
  role: "min-h-15 gap-2 px-3 py-2",
  method: "min-h-16 gap-3 px-4 py-2",
  touch: "min-h-18 gap-2 px-4 py-2",
};

interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
  variant?: RadioCardVariant;
  disabled?: boolean;
}

/**
 * A large card that is a real radio button: the input stretches over the card
 * (invisible but focusable), so keyboard and screen-reader behaviour is native.
 */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  label,
  hint,
  variant = "role",
  disabled,
}: RadioCardProps) {
  const touch = variant === "touch";
  return (
    <label
      className={cx(
        "radio-card relative box-border flex items-center rounded-md",
        VARIANTS[variant],
        checked ? "bg-moss text-white" : "bg-tea text-forest",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="absolute inset-0 m-0 size-full cursor-[inherit] opacity-0"
      />
      <span className="flex min-w-0 grow flex-col">
        <span
          className={cx(
            "font-bold",
            touch ? "text-heading tracking-heading" : "text-body tracking-bold",
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className={cx("text-label tracking-caption", checked ? "text-white" : "text-moss")}>
            {hint}
          </span>
        ) : null}
      </span>
      {checked ? <Icon name="check" /> : null}
    </label>
  );
}

interface RadioCardGroupProps {
  legend: string;
  children: ReactNode;
  className?: string;
}

/** Fieldset with a small bold legend and the two-column card grid. */
export function RadioCardGroup({ legend, children, className }: RadioCardGroupProps) {
  return (
    <fieldset className={cx("m-0 min-w-0 border-0 p-0", className)}>
      <legend className="mb-2 p-0 text-label font-bold tracking-label">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </fieldset>
  );
}
