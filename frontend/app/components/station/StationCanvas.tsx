import type { ReactNode } from "react";

import { useFitScale } from "~/lib/hooks/use-fit-scale";

export const STATION_WIDTH = 1280;
export const STATION_HEIGHT = 800;

/**
 * The fixed 1280 x 800 landscape canvas, scaled to fit the window (plan D11).
 * Everything inside is laid out at design size, so it always looks like the
 * mock-up; only the whole picture is zoomed.
 */
export function StationCanvas({ children }: { children: ReactNode }) {
  const scale = useFitScale(STATION_WIDTH, STATION_HEIGHT);
  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-page">
      <div
        className="relative flex-none"
        style={{ width: STATION_WIDTH * scale, height: STATION_HEIGHT * scale }}
      >
        <div
          className="absolute top-0 left-0 box-border flex origin-top-left flex-col overflow-hidden bg-page text-forest"
          style={{
            width: STATION_WIDTH,
            height: STATION_HEIGHT,
            transform: scale === 1 ? undefined : `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
