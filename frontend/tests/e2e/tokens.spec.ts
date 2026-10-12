import { expect, test } from "@playwright/test";

/**
 * Token test (plan section 8, item 4): the build must render the values in
 * docs/design-system.md. These read computed styles, not source files.
 */

const TOKENS: Record<string, string> = {
  "--color-page": "#f3ede3",
  "--color-forest": "#18442a",
  "--color-moss": "#45644a",
  "--color-tea": "#e4dbc4",
  "--color-field": "#f0e9dd",
  "--color-error": "#ba1a1a",
  "--color-sage": "#8aa58f",
  "--radius-chip": "4px",
  "--radius-md": "8px",
  "--radius-lg": "16px",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
});

test("declares every design token", async ({ page }) => {
  const values = await page.evaluate((names) => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
  }, Object.keys(TOKENS));
  expect(values).toEqual(TOKENS);
});

test("paints forest text on the page background in Lato", async ({ page }) => {
  const body = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return {
      background: style.backgroundColor,
      color: style.color,
      family: style.fontFamily,
    };
  });
  expect(body.background).toBe("rgb(243, 237, 227)");
  expect(body.color).toBe("rgb(24, 68, 42)");
  expect(body.family.startsWith("Lato")).toBe(true);
});

test("loads Lato 400 and 700 from the build, not a CDN", async ({ page }) => {
  // Faces load lazily, so ask for each weight explicitly: this fails if the
  // woff2 file is missing from the build.
  const loaded = await page.evaluate(async () => {
    const regular = await document.fonts.load("400 16px Lato");
    const bold = await document.fonts.load("700 16px Lato");
    return { regular: regular.length, bold: bold.length };
  });
  expect(loaded.regular).toBeGreaterThan(0);
  expect(loaded.bold).toBeGreaterThan(0);
});

test("applies the type scale to the hero heading", async ({ page }) => {
  const heading = page.getByRole("heading", { level: 1, name: "Restaurant DBMS" });
  await expect(heading).toHaveCSS("font-size", "36px");
  await expect(heading).toHaveCSS("line-height", "44px");
  await expect(heading).toHaveCSS("font-weight", "400");
});

test("shows a 2px moss focus ring", async ({ page }) => {
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.textContent = "probe";
    document.body.append(button);
  });
  await page.keyboard.press("Tab");
  const probe = page.getByRole("button", { name: "probe" });
  await expect(probe).toBeFocused();
  await expect(probe).toHaveCSS("outline-style", "solid");
  await expect(probe).toHaveCSS("outline-width", "2px");
  await expect(probe).toHaveCSS("outline-color", "rgb(69, 100, 74)");
  await expect(probe).toHaveCSS("outline-offset", "2px");
});

test("makes no requests to third-party hosts", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") external.push(request.url());
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
});
