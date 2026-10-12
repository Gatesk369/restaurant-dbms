import type { ReactNode, SVGProps } from "react";

/**
 * Icons from the mock-ups, with the exact path data (24px grid, 2px stroke,
 * round caps and joins, `currentColor`). Always decorative: pair with text or
 * an aria-label on the control.
 */
const ICONS = {
  orders: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  payments: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  menu: <path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7M6 7h4M17 3c-2 2-3 5-3 8h3v10" />,
  reports: <path d="M4 20V10M10 20V4M16 20v-8M2 20h20" />,
  signOut: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12l5 5 9-10" />,
  /** Station progress stepper: drawn with a 3px stroke. */
  checkBold: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4z" />,
  archive: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  restore: <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  bell: <path d="M6 17V11a6 6 0 0 1 12 0v6M4 17h16M10 20h4" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name" | "children"> {
  name: IconName;
  /** Pixel size; the mock-ups use 18, 20, 24 and 28. */
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth = 2, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
