import { expect, test, type Page } from "@playwright/test";
import { FakeApi } from "./fake-api";
import { fontsReady, PERSONAS, signInAs } from "./helpers";

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
}

for (const width of [512, 880, 1024, 1360, 1920]) {
  test(`staff screens use the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await new FakeApi({ tablesEndpoint: true }).install(page);
    await signInAs(page, PERSONAS.manager);
    for (const path of ["/orders", "/payments", "/menu", "/reports"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await fits(page);
      const main = (await page.getByRole("main").boundingBox())!;
      const sidebar = (await page.locator("aside").first().boundingBox())!;
      expect(main.x + main.width).toBeCloseTo(width, 0);
      if (width >= 880) {
        expect(sidebar.height).toBeGreaterThanOrEqual(900);
        expect(main.width).toBe(width - 240);
        const content = (await page.getByRole("main").locator(":scope > div").boundingBox())!;
        expect(content.width).toBe(main.width);
      } else {
        expect(sidebar.width).toBe(width);
        expect(main.y).toBeGreaterThanOrEqual(sidebar.height);
      }
      if (path === "/orders" && width <= 1024) {
        const action = page.getByRole("button", { name: "Mark ready" }).first();
        await action.focus();
        await expect(action).toBeInViewport();
        await fits(page);
        expect(
          await page
            .getByRole("table", { name: "Active orders" })
            .locator("..")
            .evaluate((e) => e.scrollLeft),
        ).toBeGreaterThan(0);
      }
      const signOut = page.getByRole("button", { name: "Sign out" });
      await signOut.focus();
      await expect(signOut).toBeInViewport();
      await expect(signOut).toHaveCSS("outline-style", "solid");
    }
  });
}

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
  // CSS viewport equivalent to a 1024×768 display at 200% browser zoom.
  { width: 512, height: 384 },
]) {
  test(`ordering remains usable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await new FakeApi({ tablesEndpoint: true, publicMenuSoldOut: true }).install(page);
    await page.goto("/station");
    await expect(page.getByRole("heading", { name: "Order from your table" })).toBeVisible();
    await fontsReady(page);
    await fits(page);
    await expect(page.locator("header")).toHaveCSS("transform", "none");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "36px");
    const table = page.getByRole("button", { name: "Table 6, 4 seats" });
    const tile = (await table.boundingBox())!;
    expect(tile.height).toBeGreaterThanOrEqual(96);
    expect(tile.width).toBeGreaterThanOrEqual(44);
    await table.focus();
    await expect(table).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    const start = page.getByRole("button", { name: "Start order" });
    await start.focus();
    await expect(start).toBeInViewport();
    await page.keyboard.press("Enter");
    const add = page.getByRole("button", { name: /^Add Matoke & Beef Stew/ });
    await expect(add).toBeVisible();
    await fits(page);
    await add.click();
    await page.screenshot({ path: testInfo.outputPath("menu.png"), fullPage: true });
    await page.getByRole("button", { name: "Drinks", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Drinks", exact: true })).toBeVisible();
    const review = page.getByRole("button", { name: "Review order" });
    await review.focus();
    await expect(review).toBeInViewport();
    expect((await review.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Check your order" })).toBeVisible();
    await fits(page);
    await page.getByLabel("Special instructions for the kitchen").fill("No onions");
    const increment = page.getByRole("button", { name: "Add one Matoke & Beef Stew" });
    expect((await increment.boundingBox())!.width).toBeGreaterThanOrEqual(48);
    await increment.click();
    await page.screenshot({ path: testInfo.outputPath("review.png"), fullPage: true });
    const send = page.getByRole("button", { name: /^Send to kitchen/ });
    await send.focus();
    await expect(send).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
    await fits(page);
    await expect(page.getByText("Kitchen note: No onions")).toBeVisible();
    const reset = page.getByRole("button", { name: "Start a new order" });
    await reset.focus();
    await expect(reset).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Order from your table" })).toBeVisible();
  });
}
