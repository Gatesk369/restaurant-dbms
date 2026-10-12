import type { ReactNode } from "react";

import { cx } from "~/lib/cx";
import { Icon } from "./Icon";

/** Staff confirmation under the page header (tea bar, check icon). */
export function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="m-0 flex items-center gap-2 rounded-md bg-tea px-4 py-3 text-body font-bold"
    >
      <Icon name="check" />
      <span>{children}</span>
    </p>
  );
}

/** Station toast: a forest pill floating at the top centre of the content area. */
export function StationToast({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="status"
      className={cx(
        "absolute top-4 left-1/2 z-2 m-0 flex -translate-x-1/2 items-center gap-2 rounded-md bg-forest px-5 py-3 text-body font-bold text-white shadow-toast",
        className,
      )}
    >
      <Icon name="check" />
      <span>{children}</span>
    </p>
  );
}
