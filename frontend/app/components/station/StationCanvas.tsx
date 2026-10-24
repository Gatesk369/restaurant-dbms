import type { ReactNode } from "react";

/** Fluid ordering workspace. Content reflows and scrolls without scaling controls. */
export function StationCanvas({ children }: { children: ReactNode }) {
  return <div className="station flex min-h-dvh flex-col bg-page text-forest">{children}</div>;
}
