import { useEffect, useRef } from "react";

const EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * Calls `onIdle` after `ms` without a touch or key press while `enabled`.
 * A kiosk uses it to forget the last customer's name and table.
 */
export function useIdle(ms: number, enabled: boolean, onIdle: () => void): void {
  const latest = useRef(onIdle);
  useEffect(() => {
    latest.current = onIdle;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer = setTimeout(() => latest.current(), ms);
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), ms);
    };
    for (const event of EVENTS) window.addEventListener(event, restart, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const event of EVENTS) window.removeEventListener(event, restart);
    };
  }, [ms, enabled]);
}
