import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cx } from "~/lib/cx";

type PanelTag = "section" | "div" | "aside" | "form";

const PAD = { md: "p-4", lg: "p-6" } as const;
const GAP = { sm: "gap-3", md: "gap-4", lg: "gap-6" } as const;

interface PanelProps
  extends HTMLAttributes<HTMLElement>, Pick<FormHTMLAttributes<HTMLFormElement>, "noValidate"> {
  as?: PanelTag;
  /** Padding: md 16 (default), lg 24 for checkout, editor and receipt. */
  pad?: keyof typeof PAD;
  /** Gap between children: sm 12 (default), md 16 for forms, lg 24 for checkout. */
  gap?: keyof typeof GAP;
  /**
   * `content` sizes the panel like the mock-up's report panels, whose
   * `flex-basis` excludes padding and border (so grow ratios split what is
   * left after those 34px). Everywhere else panels are `border`.
   */
  sizing?: "border" | "content";
  children: ReactNode;
}

/** Outlined surface: 1px tea border, 8px radius, no fill and no shadow. */
export function Panel({
  as: Tag = "section",
  pad = "md",
  gap = "sm",
  sizing = "border",
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <Tag
      className={cx(
        sizing === "content" ? "box-content" : "box-border",
        "flex flex-col rounded-md border border-tea",
        PAD[pad],
        GAP[gap],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface PanelHeadingProps {
  title: string;
  caption?: string;
  /** `section` is the 16px bold heading; `title` is the 24px regular one. */
  level?: "section" | "title";
  /** Right-aligned content (filters, an id). */
  children?: ReactNode;
}

export function PanelHeading({ title, caption, level = "section", children }: PanelHeadingProps) {
  const heading = (
    <div>
      <h2
        className={cx(
          "m-0",
          level === "section"
            ? "text-heading font-bold tracking-heading"
            : "text-panel font-normal",
        )}
      >
        {title}
      </h2>
      {caption ? <p className="m-0 text-label tracking-caption text-moss">{caption}</p> : null}
    </div>
  );
  if (!children) return heading;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {heading}
      {children}
    </div>
  );
}
