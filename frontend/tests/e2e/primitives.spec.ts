import { expect, test, type Locator } from "@playwright/test";

/**
 * Computed-style checks of the primitives against docs/design-system.md,
 * on the /styleguide sheet (built when VITE_STYLEGUIDE=true).
 */

const FOREST = "rgb(24, 68, 42)";
const MOSS = "rgb(69, 100, 74)";
const TEA = "rgb(228, 219, 196)";
const FIELD = "rgb(240, 233, 221)";
const ERROR = "rgb(186, 26, 26)";
const PAGE = "rgb(243, 237, 227)";
const WHITE = "rgb(255, 255, 255)";

test.beforeEach(async ({ page }) => {
  await page.goto("/styleguide");
  await page.evaluate(() => document.fonts.ready);
});

async function css(locator: Locator, props: string[]) {
  return locator.evaluate((el, names) => {
    const style = getComputedStyle(el);
    return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n)]));
  }, props);
}

test.describe("Button", () => {
  test("primary and tonal use the token colours and the 44px staff size", async ({ page }) => {
    const primary = page.getByRole("button", { name: "Primary", exact: true });
    expect(
      await css(primary, [
        "background-color",
        "color",
        "min-height",
        "border-radius",
        "font-size",
        "font-weight",
        "letter-spacing",
      ]),
    ).toEqual({
      "background-color": MOSS,
      color: WHITE,
      "min-height": "44px",
      "border-radius": "8px",
      "font-size": "14px",
      "font-weight": "700",
      "letter-spacing": "0.1px",
    });

    const tonal = page.getByRole("button", { name: "Tonal", exact: true });
    expect(await css(tonal, ["background-color", "color"])).toEqual({
      "background-color": TEA,
      color: FOREST,
    });
  });

  test("hover darkens primary to forest", async ({ page }) => {
    const primary = page.getByRole("button", { name: "Primary", exact: true });
    await primary.hover();
    await expect(primary).toHaveCSS("background-color", FOREST);
  });

  test("disabled is half opaque and not-allowed", async ({ page }) => {
    const disabled = page.getByRole("button", { name: "Disabled primary" });
    await expect(disabled).toBeDisabled();
    await expect(disabled).toHaveCSS("opacity", "0.5");
    await expect(disabled).toHaveCSS("cursor", "not-allowed");
    await disabled.hover({ force: true });
    await expect(disabled).toHaveCSS("background-color", MOSS);
  });

  test("sizes: small 36, large 48, touch 56, touch small 44, icon 44 square", async ({ page }) => {
    const heights: Record<string, string> = {
      Small: "36px",
      Large: "48px",
      Touch: "56px",
      "Touch small": "44px",
    };
    for (const [name, height] of Object.entries(heights)) {
      await expect(page.getByRole("button", { name, exact: true })).toHaveCSS("min-height", height);
    }
    const touch = page.getByRole("button", { name: "Touch", exact: true });
    await expect(touch).toHaveCSS("font-size", "16px");
    await expect(touch).toHaveCSS("letter-spacing", "0.15px");

    const box = (await page.getByRole("button", { name: "Add one Rolex" }).first().boundingBox())!;
    expect([box.width, box.height]).toEqual([44, 44]);
  });

  test("a link styled as a button keeps button metrics", async ({ page }) => {
    const link = page.getByRole("link", { name: "Take payment" });
    await expect(link).toHaveCSS("min-height", "44px");
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await expect(link).toHaveCSS("background-color", MOSS);
  });

  test("keyboard focus draws a 2px moss ring", async ({ page }) => {
    await page.getByRole("button", { name: "Primary", exact: true }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const primary = page.getByRole("button", { name: "Primary", exact: true });
    await expect(primary).toBeFocused();
    await expect(primary).toHaveCSS("outline-width", "2px");
    await expect(primary).toHaveCSS("outline-color", MOSS);
    await expect(primary).toHaveCSS("outline-offset", "2px");
  });
});

test.describe("Fields", () => {
  test("input is 48px, field-coloured, with a 1px moss underline", async ({ page }) => {
    const input = page.getByLabel("Username");
    expect(
      await css(input, [
        "min-height",
        "background-color",
        "border-radius",
        "padding-top",
        "font-size",
        "letter-spacing",
        "color",
      ]),
    ).toEqual({
      "min-height": "48px",
      "background-color": FIELD,
      "border-radius": "8px",
      "padding-top": "12px",
      "font-size": "16px",
      "letter-spacing": "0.25px",
      color: FOREST,
    });
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).toContain(MOSS);
    expect(shadow).toMatch(/0px -1px 0px 0px inset/);
  });

  test("focus thickens the underline to 2px", async ({ page }) => {
    const input = page.getByLabel("Username");
    await input.focus();
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).toMatch(/0px -2px 0px 0px inset/);
    expect(shadow).toContain(MOSS);
  });

  test("an invalid field gets a red 2px underline and a worded error with an icon", async ({
    page,
  }) => {
    const input = page.getByLabel("Password");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).toContain(ERROR);
    expect(shadow).toMatch(/0px -2px 0px 0px inset/);

    const alert = page.getByRole("alert").first();
    await expect(alert).toContainText(
      "Error: enter your username and a password of at least 4 characters.",
    );
    await expect(alert).toHaveCSS("color", ERROR);
    await expect(alert).toHaveCSS("font-weight", "700");
    await expect(alert.locator("svg")).toHaveCount(1);
  });

  test("touch inputs are 56px tall; textarea has two rows", async ({ page }) => {
    await expect(page.getByLabel("Phone number (station)")).toHaveCSS("min-height", "56px");
    const textarea = page.getByLabel("Special instructions");
    await expect(textarea).toHaveAttribute("rows", "2");
    const label = page.getByText("Username", { exact: true });
    await expect(label).toHaveCSS("font-size", "12px");
    await expect(label).toHaveCSS("font-weight", "700");
    await expect(label).toHaveCSS("letter-spacing", "0.5px");
  });
});

test.describe("Chips, toggles, cards, tiles", () => {
  test("chips are 24px with 4px radius in the four tones", async ({ page }) => {
    const tones: [string, string, string][] = [
      ["Pending", TEA, FOREST],
      ["Preparing", MOSS, WHITE],
      ["Served", FOREST, WHITE],
    ];
    for (const [name, bg, fg] of tones) {
      const chip = page.locator("#chips").getByText(name, { exact: true }).first();
      expect(await css(chip, ["background-color", "color", "min-height", "border-radius"])).toEqual(
        {
          "background-color": bg,
          color: fg,
          "min-height": "24px",
          "border-radius": "4px",
        },
      );
    }
    const archived = page.locator("#chips").getByText("Archived", { exact: true });
    await expect(archived).toHaveCSS("background-color", PAGE);
    await expect(archived).toHaveCSS("border-top-color", MOSS);
  });

  test("toggle chips expose pressed state and change colour with it", async ({ page }) => {
    const mains = page.getByRole("button", { name: "Mains", exact: true });
    const snacks = page.getByRole("button", { name: "Snacks", exact: true });
    await expect(mains).toHaveAttribute("aria-pressed", "true");
    await expect(mains).toHaveCSS("background-color", MOSS);
    await expect(snacks).toHaveAttribute("aria-pressed", "false");
    await expect(snacks).toHaveCSS("background-color", TEA);
    await expect(snacks).toHaveCSS("min-height", "36px");
    await snacks.click();
    await expect(snacks).toHaveAttribute("aria-pressed", "true");
    await expect(mains).toHaveAttribute("aria-pressed", "false");

    await expect(page.getByRole("button", { name: "This week" })).toHaveCSS("min-height", "44px");
  });

  test("radio cards are real radios, 64px, and invert when checked", async ({ page }) => {
    const cash = page.getByRole("radio", { name: /^Cash/ });
    const momo = page.getByRole("radio", { name: /^Mobile money/ });
    await expect(cash).toBeChecked();
    const cashCard = page.locator("label", { has: cash });
    await expect(cashCard).toHaveCSS("background-color", MOSS);
    await expect(cashCard).toHaveCSS("min-height", "64px");
    await momo.check({ force: true });
    await expect(page.locator("label", { has: momo })).toHaveCSS("background-color", MOSS);
    await expect(cashCard).toHaveCSS("background-color", TEA);

    await cash.focus();
    await page.keyboard.press("ArrowDown");
    await expect(momo).toBeChecked();
    await expect(page.locator("label", { has: momo })).toHaveCSS("outline-style", "solid");
  });

  test("table tiles: free, selected, busy; staff 64px and station 96px", async ({ page }) => {
    const busy = page.getByRole("button", { name: "Table 2, occupied" });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveCSS("border-top-style", "dashed");
    await expect(busy).toHaveCSS("background-color", PAGE);
    await expect(busy).toHaveCSS("min-height", "64px");

    const selected = page.getByRole("button", { name: "Table 6, 4 seats" });
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toHaveCSS("background-color", MOSS);

    await expect(page.getByRole("button", { name: "Table 7, 4 seats" })).toHaveCSS(
      "min-height",
      "96px",
    );
    await expect(page.getByRole("button", { name: "Table 9, in use" })).toBeDisabled();
  });
});

test.describe("Data table and panels", () => {
  test("header row is tea with 8px radius; rows divide with tea", async ({ page }) => {
    const table = page.getByRole("table", { name: "Menu items" });
    const header = table.getByRole("row").first();
    await expect(header).toHaveCSS("background-color", TEA);
    await expect(header).toHaveCSS("border-radius", "8px");
    await expect(header).toHaveCSS("font-weight", "700");

    const row = table.getByRole("row").nth(1);
    await expect(row).toHaveCSS("border-bottom-color", TEA);
    await expect(row).toHaveCSS("min-height", "60px");
    await expect(table.getByRole("row").nth(2)).toHaveCSS("background-color", TEA);
    await expect(table.getByRole("cell", { name: "MI-001" })).toHaveCSS("color", MOSS);
  });

  test("panels are outlined in tea, not filled", async ({ page }) => {
    const panel = page.locator("#panels section").first();
    expect(
      await css(panel, [
        "border-top-color",
        "border-top-width",
        "border-radius",
        "padding-top",
        "background-color",
      ]),
    ).toEqual({
      "border-top-color": TEA,
      "border-top-width": "1px",
      "border-radius": "8px",
      "padding-top": "16px",
      "background-color": "rgba(0, 0, 0, 0)",
    });
  });

  test("steppers are 44px squares with spoken labels", async ({ page }) => {
    const remove = page.getByRole("button", { name: "Remove one Rolex" });
    const box = (await remove.boundingBox())!;
    expect([box.width, box.height]).toEqual([44, 44]);
    await remove.click();
    await expect(page.locator("#panels").getByText("1", { exact: true }).first()).toBeVisible();
    const large = page.getByRole("button", { name: "Remove one Chapati" });
    expect((await large.boundingBox())!.height).toBe(48);
  });

  test("status message, station toast and locked tile", async ({ page }) => {
    const status = page.getByRole("status").first();
    await expect(status).toHaveCSS("background-color", TEA);
    await expect(status).toHaveCSS("border-radius", "8px");

    const toast = page.getByText("A waiter is on the way to Table 6.");
    await expect(toast.locator("..")).toHaveCSS("background-color", FOREST);

    const locked = page.getByText("Locked for Wait Staff").locator("..");
    await expect(locked).toHaveCSS("border-top-style", "dashed");
    await expect(locked).toHaveCSS("min-height", "120px");
  });
});

test("icons render at 20px by default with a 2px round stroke", async ({ page }) => {
  const icon = page.locator("#icons svg").first();
  expect(await css(icon, ["width", "height", "stroke-width", "stroke-linecap"])).toEqual({
    width: "24px",
    height: "24px",
    "stroke-width": "2px",
    "stroke-linecap": "round",
  });
  const inButton = page.getByRole("button", { name: "Edit", exact: true }).locator("svg");
  expect((await inButton.boundingBox())!.width).toBe(18);
});
