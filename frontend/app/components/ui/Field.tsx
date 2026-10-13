import {
  createContext,
  type AriaAttributes,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cx } from "~/lib/cx";
import { Icon } from "./Icon";

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

interface FieldProps {
  label: string;
  /** Message shown under the field; the text must already start with "Error:". */
  error?: string | null;
  /** Caption under the field (moss, 12/16). */
  hint?: ReactNode;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label above, control, then hint and error below. The control (Input, Select
 * or Textarea) picks up its id, `aria-invalid` and `aria-describedby` from here.
 */
export function Field({ label, error, hint, hideLabel, className, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <FieldContext.Provider
      value={{ id, describedBy: describedBy || undefined, invalid: Boolean(error) }}
    >
      <div className={cx("flex min-w-0 flex-col gap-1", className)}>
        <label
          htmlFor={id}
          className={cx("text-label font-bold tracking-label", hideLabel && "sr-only")}
        >
          {label}
        </label>
        {children}
        {error ? (
          <FieldError id={errorId} className="mt-1">
            {error}
          </FieldError>
        ) : null}
        {hint ? (
          <p id={hintId} className="m-0 mt-1 text-label tracking-caption text-moss">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

interface FieldErrorProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

/** Inline, worded error with an icon; never colour alone. */
export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cx("m-0 flex items-center gap-2 text-body font-bold text-error", className)}
    >
      <Icon name="error" />
      <span>{children}</span>
    </p>
  );
}

/** `touch` is the 56px station size; `staff` is 48px. */
type ControlSize = "staff" | "touch";

const CONTROL_BASE =
  "box-border block w-full rounded-md border-0 bg-field text-[16px] leading-[normal] tracking-body text-forest " +
  "shadow-[inset_0_-1px_0_var(--color-moss)] focus:shadow-[inset_0_-2px_0_var(--color-moss)] " +
  "aria-[invalid=true]:shadow-[inset_0_-2px_0_var(--color-error)]";

const CONTROL_SIZES: Record<ControlSize, string> = {
  staff: "min-h-12 p-3",
  touch: "min-h-14 px-3 py-3.5",
};

function useControlProps(props: {
  id?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-describedby"?: string;
}) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid ? true : undefined),
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
  };
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  controlSize?: ControlSize;
}

export function Input({ controlSize = "staff", className, ...rest }: InputProps) {
  const control = useControlProps(rest);
  return (
    <input
      type="text"
      {...rest}
      {...control}
      className={cx(CONTROL_BASE, CONTROL_SIZES[controlSize], className)}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  controlSize?: ControlSize;
}

export function Select({ controlSize = "staff", className, ...rest }: SelectProps) {
  const control = useControlProps(rest);
  return (
    <select
      {...rest}
      {...control}
      className={cx(CONTROL_BASE, CONTROL_SIZES[controlSize], className)}
    />
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  controlSize?: ControlSize;
}

export function Textarea({ controlSize = "staff", rows = 2, className, ...rest }: TextareaProps) {
  const control = useControlProps(rest);
  return (
    <textarea
      rows={rows}
      {...rest}
      {...control}
      className={cx(CONTROL_BASE, CONTROL_SIZES[controlSize], className)}
    />
  );
}
