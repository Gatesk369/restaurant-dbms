import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect, test, type FrameLocator, type Page } from "@playwright/test";

/**
 * Reference captures of the approved mock-ups (plan section 8, item 1).
 * Artboard sizes: staff screens 1360 wide, station 1280 x 800.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const designDir = path.resolve(here, "../../../docs/design");
const out = (name: string) => path.join(here, "reference", `${name}.png`);
const fileUrl = (name: string) => pathToFileURL(path.join(designDir, name)).href;

const STAFF_SCREENS = [
  { title: "Sign in and startup menu", file: "staff-sign-in", height: 780 },
  { title: "Orders", file: "staff-orders", height: 1560 },
  { title: "Payments", file: "staff-payments", height: 1000 },
  { title: "Menu management", file: "staff-menu", height: 1500 },
  { title: "Reports", file: "staff-reports", height: 2060 },
] as const;

async function openStaff(page: Page) {
  // Taller than the tallest artboard, so no screen scrolls inside its frame
  // (the sticky sidebar would otherwise be captured mid-scroll).
  await page.setViewportSize({ width: 1400, height: 2300 });
  await page.goto(fileUrl("staff-app-mockups.html"));
  // The board headings have a fractional height, which puts every artboard
  // after the first on a half pixel and shifts its capture by 1px. Pin it.
  await page.addStyleTag({ content: ".board h2 { height: 16px; line-height: 16px; }" });
  for (const { title } of STAFF_SCREENS) {
    const frame = page.frameLocator(`iframe[title="${title}"]`);
    // Each screen renders its heading or form once its bundle has unpacked.
    await expect(frame.locator("body")).not.toHaveText(/^\s*$/, { timeout: 30_000 });
  }
  await page.evaluate(() => document.fonts.ready);
}

async function shoot(page: Page, title: string, file: string) {
  const handle = page.locator(`iframe[title="${title}"]`);
  await handle.scrollIntoViewIfNeeded();
  // Park the pointer on an inert spot inside the frame (the wordmark area) so
  // no button is captured in its hover colour; moving it out of the frame does
  // not clear hover inside the frame reliably.
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + 130, box!.y + 38);
  await page.waitForTimeout(100);
  await handle.screenshot({ path: out(file), animations: "disabled" });
  const expected = STAFF_SCREENS.find((s) => s.title === title)?.height;
  expect(box?.width).toBe(1360);
  expect(box?.height).toBe(expected);
}

test("staff app: each screen at its artboard size", async ({ page }) => {
  await openStaff(page);
  for (const { title, file } of STAFF_SCREENS) {
    await shoot(page, title, file);
  }
});

test("staff app: startup menu for each role", async ({ page }) => {
  await openStaff(page);
  const frame: FrameLocator = page.frameLocator('iframe[title="Sign in and startup menu"]');
  const roles = [
    ["Cashier", "cashier"],
    ["Wait Staff", "wait-staff"],
    ["Kitchen Staff", "kitchen"],
    ["Manager", "manager"],
  ] as const;

  // The sign-in form is the default state; choose each role and submit.
  for (const [label, slug] of roles) {
    await frame.getByRole("radio", { name: new RegExp(`^${label}`) }).check({ force: true });
    await frame.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(frame.getByRole("heading", { name: "Startup menu" })).toBeVisible();
    await shoot(page, "Sign in and startup menu", `staff-startup-${slug}`);
    await frame.getByRole("button", { name: "Sign out" }).click();
    await expect(frame.getByRole("heading", { name: "Sign in" })).toBeVisible();
  }

  // Validation error state.
  await frame.getByLabel("Password").fill("abc");
  await frame.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(frame.getByRole("alert")).toContainText("Error: enter your username");
  await shoot(page, "Sign in and startup menu", "staff-sign-in-error");
});

test("staff app: payments states", async ({ page }) => {
  await openStaff(page);
  const frame = page.frameLocator('iframe[title="Payments"]');
  await expect(frame.getByRole("heading", { name: /^ORD-1045/ })).toBeVisible();

  // Cash short of the total (nothing received yet).
  await frame.getByRole("button", { name: /^Record payment/ }).click();
  await expect(frame.getByRole("alert")).toContainText("short of the total");
  await shoot(page, "Payments", "staff-payments-cash-error");

  // Cash with a received amount: change due.
  await frame.getByLabel("Amount received (UGX)").fill("100000");
  await shoot(page, "Payments", "staff-payments-cash-change");

  // Mobile money, invalid number.
  await frame.getByRole("radio", { name: /^Mobile money/ }).check({ force: true });
  await frame.getByLabel("Customer phone number").fill("0772");
  await frame.getByRole("button", { name: /^Record payment/ }).click();
  await expect(frame.getByRole("alert")).toContainText("10-digit number");
  await shoot(page, "Payments", "staff-payments-momo-error");

  // Recorded: receipt.
  await frame.getByLabel("Customer phone number").fill("0772123456");
  await frame.getByRole("button", { name: /^Record payment/ }).click();
  await expect(frame.getByText("Payment recorded", { exact: true })).toBeVisible();
  await shoot(page, "Payments", "staff-payments-receipt");
});

test("staff app: menu management states", async ({ page }) => {
  await openStaff(page);
  const frame = page.frameLocator('iframe[title="Menu management"]');
  await expect(frame.getByRole("heading", { name: "Item details" })).toBeVisible();

  // Add item: the empty form, then both validation errors.
  await frame.getByRole("button", { name: "Add item" }).click();
  await expect(frame.getByRole("heading", { name: "Add item", level: 2 })).toBeVisible();
  await shoot(page, "Menu management", "staff-menu-add");
  await frame.getByRole("button", { name: "Save item" }).click();
  await expect(frame.getByRole("alert")).toHaveCount(2);
  await shoot(page, "Menu management", "staff-menu-add-errors");

  // Edit an unavailable item (MI-005).
  await frame.getByRole("button", { name: "Edit Grilled Goat Ribs" }).click();
  await expect(frame.getByRole("heading", { name: "Edit MI-005" })).toBeVisible();
  await shoot(page, "Menu management", "staff-menu-edit");

  // Archive an item: toast and the editor closes.
  await frame.getByRole("button", { name: "Archive Fruit Platter" }).click();
  await expect(frame.getByRole("status")).toContainText("Fruit Platter archived.");
  await shoot(page, "Menu management", "staff-menu-archived-toast");

  // Show archived items.
  await frame.getByRole("checkbox", { name: /Show archived/ }).click();
  await shoot(page, "Menu management", "staff-menu-show-archived");

  // A category filter with a search that matches nothing.
  await frame.getByLabel("Search menu items").fill("zzz");
  await expect(frame.getByText("No items match.")).toBeVisible();
  await shoot(page, "Menu management", "staff-menu-no-match");
});

test("staff app: reports states", async ({ page }) => {
  await openStaff(page);
  const frame = page.frameLocator('iframe[title="Reports"]');
  await expect(frame.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();

  // Last 4 weeks.
  await frame.getByRole("button", { name: "Last 4 weeks" }).click();
  await expect(frame.getByText("14 September to 11 October 2026")).toBeVisible();
  await shoot(page, "Reports", "staff-reports-month");
});

test("ordering station: the four steps", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fileUrl("ordering-station-mockup.html"));
  await expect(page.getByRole("heading", { name: "Order from your table" })).toBeVisible({
    timeout: 30_000,
  });
  await page.evaluate(() => document.fonts.ready);
  const shot = async (name: string) => {
    // Park the pointer so no button is captured in its hover colour (the
    // click that led here leaves it over the next screen's main button).
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    await page.screenshot({
      path: out(name),
      animations: "disabled",
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
  };

  await shot("station-1-table");

  await page.getByRole("button", { name: "Table 6, 4 seats" }).click();
  await page.getByRole("button", { name: "Start order" }).click();
  await expect(page.getByRole("heading", { name: "Mains" })).toBeVisible();
  // Grilled Goat Ribs is the mock-up's sold-out card (dashed, dimmed, disabled).
  await expect(page.getByRole("button", { name: "Grilled Goat Ribs, sold out" })).toBeDisabled();
  await shot("station-2-menu-empty");

  await page.getByRole("button", { name: /^Add Matoke & Beef Stew/ }).click();
  await page.getByRole("button", { name: /^Add Chicken Luwombo/ }).click();
  await page.getByRole("button", { name: /^Add Matoke & Beef Stew/ }).click();
  await expect(page.getByText("×2")).toBeVisible();
  await shot("station-2-menu-cart");

  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("heading", { name: "Check your order" })).toBeVisible();
  await shot("station-3-review-till");

  await page.getByRole("radio", { name: /^Mobile money now/ }).check({ force: true });
  await page.getByLabel("Phone number").fill("0772");
  await page.getByRole("button", { name: /^Send to kitchen/ }).click();
  await expect(page.getByRole("alert")).toContainText("Error: enter a 10-digit number");
  await shot("station-3-review-momo-error");

  await page.getByLabel("Phone number").fill("0772123456");
  await page.getByRole("button", { name: /^Send to kitchen/ }).click();
  await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
  await shot("station-4-done-pending");

  await page.getByRole("button", { name: /Prototype only/ }).click();
  await shot("station-4-done-preparing");
});
