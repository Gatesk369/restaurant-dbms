import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Locator, type Page } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));

export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Comparison {
  /** Share of pixels whose colour differs by more than the tolerance. */
  ratio: number;
  differing: number;
  total: number;
  /** Bounding box of the differing pixels, relative to the clip (null when identical). */
  bounds: { x0: number; y0: number; x1: number; y1: number } | null;
}

/**
 * Compares a screenshot of the running app with a region of a reference
 * capture of the mock-up (tests/visual/reference/<name>.png). Both come from
 * the same Chromium at 1x, so a faithful build differs only by sub-pixel noise.
 * Decoding and diffing run in a scratch browser page, so no image library is
 * needed.
 */
export async function compareWithReference(
  page: Page,
  actual: Buffer,
  reference: string,
  clip: Clip,
  channelTolerance = 24,
): Promise<Comparison> {
  const referencePng = readFileSync(path.join(here, "reference", `${reference}.png`));
  const scratch = await page.context().newPage();
  try {
    return await scratch.evaluate(
      async ({ actualB64, referenceB64, clip, tolerance }) => {
        const load = (b64: string) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("could not decode image"));
            image.src = `data:image/png;base64,${b64}`;
          });
        const [shot, ref] = await Promise.all([load(actualB64), load(referenceB64)]);
        if (shot.width !== clip.width || shot.height !== clip.height) {
          throw new Error(
            `Size mismatch: app is ${shot.width}x${shot.height}, reference clip is ${clip.width}x${clip.height}`,
          );
        }
        const pixels = (image: CanvasImageSource, sx: number, sy: number) => {
          const canvas = document.createElement("canvas");
          canvas.width = clip.width;
          canvas.height = clip.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(image, sx, sy, clip.width, clip.height, 0, 0, clip.width, clip.height);
          return ctx.getImageData(0, 0, clip.width, clip.height).data;
        };
        const a = pixels(shot, 0, 0);
        const b = pixels(ref, clip.x, clip.y);
        let differing = 0;
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -1;
        let y1 = -1;
        for (let i = 0; i < a.length; i += 4) {
          const delta = Math.max(
            Math.abs(a[i] - b[i]),
            Math.abs(a[i + 1] - b[i + 1]),
            Math.abs(a[i + 2] - b[i + 2]),
          );
          if (delta > tolerance) {
            differing++;
            const px = (i / 4) % clip.width;
            const py = Math.floor(i / 4 / clip.width);
            if (px < x0) x0 = px;
            if (px > x1) x1 = px;
            if (py < y0) y0 = py;
            if (py > y1) y1 = py;
          }
        }
        const total = clip.width * clip.height;
        return {
          ratio: differing / total,
          differing,
          total,
          bounds: differing ? { x0, y0, x1, y1 } : null,
        };
      },
      {
        actualB64: actual.toString("base64"),
        referenceB64: referencePng.toString("base64"),
        clip,
        tolerance: channelTolerance,
      },
    );
  } finally {
    await scratch.close();
  }
}

/** Plan section 1: under 0.5% of pixels per artboard region. */
export const MAX_DIFF_RATIO = 0.005;

export async function expectMatchesReference(
  page: Page,
  reference: string,
  clip: Clip,
  options: { maxRatio?: number } = {},
) {
  const actual = await page.screenshot({ clip, animations: "disabled" });
  const result = await compareWithReference(page, actual, reference, clip);
  expect(
    result.ratio,
    `${reference} @ ${clip.x},${clip.y} ${clip.width}x${clip.height}: ${result.differing} of ${result.total} pixels differ, within ${JSON.stringify(result.bounds)}`,
  ).toBeLessThanOrEqual(options.maxRatio ?? MAX_DIFF_RATIO);
}

/**
 * Compares one element of the running app with a rectangle of a reference
 * capture. The element's own position does not matter (the page may place it
 * anywhere); its size must match the reference to within a pixel, because flex
 * layouts leave fractional widths that a screenshot rounds outward.
 */
export async function expectElementMatchesReference(
  page: Page,
  element: Locator,
  reference: string,
  clip: Clip,
  options: { maxRatio?: number } = {},
) {
  await element.scrollIntoViewIfNeeded();
  // A hovered control is drawn darker; the references have no pointer.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(100);
  // Page coordinates (not viewport), so elements taller than the window work.
  const box = await element.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
  });
  expect(
    Math.abs(box.width - clip.width),
    `${reference}: element is ${box.width}px wide, reference is ${clip.width}px`,
  ).toBeLessThan(1.5);
  expect(
    Math.abs(box.height - clip.height),
    `${reference}: element is ${box.height}px high, reference is ${clip.height}px`,
  ).toBeLessThan(1.5);

  const actual = await page.screenshot({
    fullPage: true,
    clip: {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: clip.width,
      height: clip.height,
    },
    animations: "disabled",
  });
  const result = await compareWithReference(page, actual, reference, clip);
  expect(
    result.ratio,
    `${reference} @ ${clip.x},${clip.y} ${clip.width}x${clip.height}: ${result.differing} of ${result.total} pixels differ, within ${JSON.stringify(result.bounds)}`,
  ).toBeLessThanOrEqual(options.maxRatio ?? MAX_DIFF_RATIO);
}
