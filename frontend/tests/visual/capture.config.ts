import { defineConfig, devices } from "@playwright/test";

/**
 * Renders the mock-ups in docs/design/ and saves reference PNGs to
 * tests/visual/reference/. Run with `npm run capture:references`.
 * No web server: the mock-ups are opened straight from disk.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "capture-references.capture.ts",
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    deviceScaleFactor: 1,
    colorScheme: "light",
  },
});
