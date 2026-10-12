import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cx } from "~/lib/cx";

export type ChipTone = "neutral" | "active" | "done" | "outline";

const TONES: Record<ChipTone, string> = {
  /** Counts, "Pending", "Sold out". */
  neutral: "bg-tea text-forest",
  /** Quantities, "Preparing", "Available". */
  active: "bg-moss text-white",
  /** "Served". */
  done: "bg-forest text-white",
  /** "Archived", "Cancelled": page colour with a moss border. */
  outline: "border border-moss bg-page text-moss",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  children: ReactNode;
}

/** Status or count label. It always prints its word; colour only reinforces. */
export function Chip({ tone = "neutral", className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cx(
        "box-border inline-flex min-h-6 items-center gap-1 rounded-chip px-2 text-label leading-[normal] font-bold tracking-label",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * chip: filter and category chips (36) · large: date-range toggle (44) · rail:
 * station category buttons (64).
 */
export type ToggleSize = "chip" | "large" | "rail";

const TOGGLE_SIZES: Record<ToggleSize, string> = {
  chip: "min-h-9 rounded-chip px-3 text-label tracking-label",
  large: "min-h-11 rounded-md px-4 text-body tracking-bold",
  rail: "min-h-16 w-full justify-start rounded-md px-4 text-left text-heading tracking-heading",
};

interface ToggleChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> {
  pressed: boolean;
  size?: ToggleSize;
}

/** A toggle button with an explicit pressed state (`aria-pressed`). */
export function ToggleChip({
  pressed,
  size = "chip",
  className,
  type = "button",
  children,
  ...rest
}: ToggleChipProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cx(
        "box-border inline-flex cursor-pointer items-center border-0 font-bold leading-[normal] hover:brightness-95",
        TOGGLE_SIZES[size],
        pressed ? "bg-moss text-white" : "bg-tea text-forest",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

interface ToggleGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Names the group for screen readers, e.g. "Date range". */
  label?: string;
}

export function ToggleGroup({ label, className, children, ...rest }: ToggleGroupProps) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      className={cx("flex flex-wrap gap-2", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
