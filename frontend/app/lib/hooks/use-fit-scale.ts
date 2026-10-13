import { useEffect, useState } from "react";

/**
 * Uniform scale that fits a fixed design size into the window (plan D11): the
 * station is drawn at 1280 x 800 and scaled, so it keeps its proportions on any
 * wall or table screen.
 */
export function useFitScale(width: number, height: number): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height]);

  return scale;
}
