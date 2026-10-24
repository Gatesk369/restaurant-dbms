import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

import { cx } from "~/lib/cx";

export type ButtonVariant = "primary" | "tonal";
/**
 * sm: compact toggle (36) · md: staff default (44) · row: table row actions
 * (44, 12px side padding) · lg: staff primary action (48) · touch: station
 * default (56) · touchSm: station small (44).
 */
export type ButtonSize = "sm" | "md" | "row" | "lg" | "touch" | "touchSm";

const BASE =
  "box-border inline-flex items-center justify-center gap-2 rounded-md border-0 font-bold leading-[normal] no-underline";

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 text-label tracking-label",
  md: "min-h-11 text-body tracking-bold",
  row: "min-h-11 text-body tracking-bold",
  lg: "min-h-12 text-body tracking-bold",
  touch: "min-h-14 text-heading tracking-heading",
  // Station small buttons keep the 0.15px spacing of the station button class.
  touchSm: "min-h-11 text-body tracking-heading",
};

const PADDING: Record<ButtonSize, string> = {
  sm: "px-3",
  md: "px-4",
  row: "px-3",
  lg: "px-5",
  touch: "px-6",
  touchSm: "px-4",
};

/** Icon-only buttons keep the height, take no side padding and become square. */
const ICON_ONLY: Record<ButtonSize, string> = {
  sm: "min-w-9 px-0",
  md: "min-w-11 px-0",
  row: "min-w-11 px-0",
  lg: "min-w-12 px-0",
  touch: "min-w-14 px-0",
  touchSm: "min-w-11 px-0",
};

function variantClass(variant: ButtonVariant, link: boolean): string {
  if (variant === "primary") {
    return cx("bg-moss text-white", link ? "hover:bg-forest" : "not-disabled:hover:bg-forest");
  }
  return cx(
    "bg-tea text-forest",
    link ? "hover:brightness-95" : "not-disabled:hover:brightness-95",
  );
}

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  link?: boolean;
  className?: string;
}

export function buttonClass({
  variant = "primary",
  size = "md",
  icon = false,
  link = false,
  className,
}: StyleOptions): string {
  return cx(
    BASE,
    SIZES[size],
    icon ? ICON_ONLY[size] : PADDING[size],
    variantClass(variant, link),
    link ? "cursor-pointer" : "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square icon-only button; give it an `aria-label`. */
  icon?: boolean;
  /** Request in flight: disables the button and sets aria-busy. */
  pending?: boolean;
  /** Visible text and live announcement while pending. */
  pendingLabel?: string;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  pending = false,
  pendingLabel = "Working…",
  "aria-label": ariaLabel,
  disabled,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <>
      <button
        type={type}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        aria-label={pending ? pendingLabel : ariaLabel}
        className={buttonClass({ variant, size, icon, className })}
        {...rest}
      >
        {pending ? <Spinner /> : null}
        {pending ? <span className={icon ? "sr-only" : undefined}>{pendingLabel}</span> : children}
      </button>
      {/* Outside the busy button; fixed positioning keeps this hidden node from widening scroll areas. */}
      <span className="sr-only fixed" aria-live="polite" aria-atomic="true">
        {pending ? pendingLabel : ""}
      </span>
    </>
  );
}

/** Decorative indicator; the surrounding control or status supplies its label. */
export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
    />
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** A navigation link that looks like a button ("Take payment", "Back to orders"). */
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, link: true, className })} {...rest} />;
}
