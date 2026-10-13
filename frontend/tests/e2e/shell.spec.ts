import { expect, test } from "@playwright/test";

import { expectMatchesReference } from "../visual/compare";
import { FakeApi } from "./fake-api";
import { PERSONAS, fontsReady, signInAs } from "./helpers";

// Orders loads real data now, so the shell tests run against the fake API.
test.beforeEach(async ({ page }) => {
  await new FakeApi({ tablesEndpoint: true }).install(page);
});

test.describe("session guard", () => {
  test("sends a visitor without a session back to sign-in", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Restaurant DBMS" })).toBeVisible();
  });
});

test.describe("staff shell", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("renders the 240px forest sidebar with the signed-in user", async ({ page }) => {
    await signInAs(page, PERSONAS.waiter);
    await page.goto("/orders");

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toHaveCSS("background-color", "rgb(24, 68, 42)");
    await expect(sidebar).toHaveCSS("color", "rgb(243, 237, 227)");
    expect((await sidebar.boundingBox())?.width).toBe(240);

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText(["Orders", "Payments", "Menu", "Reports"]);
    await expect(sidebar.getByText("Okello Peter")).toBeVisible();
    await expect(sidebar.getByText("Wait Staff")).toBeVisible();
  });

  test("marks the current page with a tea tab", async ({ page }) => {
    await signInAs(page, PERSONAS.manager);
    await page.goto("/menu");
    const current = page.getByRole("link", { name: "Menu", exact: true });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current).toHaveCSS("background-color", "rgb(228, 219, 196)");
    await expect(current).toHaveCSS("color", "rgb(24, 68, 42)");
    await expect(current).toHaveCSS("min-height", "48px");

    const other = page.getByRole("link", { name: "Orders", exact: true });
    await expect(other).not.toHaveAttribute("aria-current", "page");
    await expect(other).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await other.hover();
    await expect(other).toHaveCSS("background-color", "rgb(69, 100, 74)");
  });

  test("keeps the sidebar sticky and the content at most 1280px wide", async ({ page }) => {
    await signInAs(page, PERSONAS.waiter);
    await page.goto("/orders");
    await expect(page.locator("aside").first().locator("> div")).toHaveCSS("position", "sticky");
    const content = page.locator("main, aside ~ div > div").first();
    expect((await content.boundingBox())!.width).toBeLessThanOrEqual(1280);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "32px");
  });

  test("navigates between screens without losing the session", async ({ page }) => {
    await signInAs(page, PERSONAS.manager);
    await page.goto("/orders");
    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
    await expect(page).toHaveTitle("Reports · Restaurant DBMS");
  });

  test("shows a locked panel for screens the role cannot use", async ({ page }) => {
    await signInAs(page, PERSONAS.waiter);
    await page.goto("/payments");
    await expect(page.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
    await expect(page.getByText("Locked for Wait Staff")).toBeVisible();
    // Navigation stays open so reviewers can move through every screen.
    await expect(page.getByRole("link", { name: "Reports", exact: true })).toBeVisible();

    await page.goto("/menu");
    await expect(page.getByText("Locked for Wait Staff")).toBeVisible();
  });

  test("lets a cashier into Payments and locks Reports", async ({ page }) => {
    await signInAs(page, PERSONAS.cashier);
    await page.goto("/payments");
    await expect(page.getByText(/^Locked for/)).toHaveCount(0);
    await page.goto("/reports");
    await expect(page.getByText("Locked for Cashier")).toBeVisible();
  });

  test("signs out and clears the stored session", async ({ page }) => {
    await signInAs(page, PERSONAS.cashier);
    await page.goto("/orders");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => sessionStorage.getItem("rdbms.staff"))).toBeNull();
  });
});

test.describe("staff shell below 880px", () => {
  test.use({ viewport: { width: 800, height: 900 } });

  test("collapses the sidebar into a row above the content", async ({ page }) => {
    await signInAs(page, PERSONAS.waiter);
    await page.goto("/orders");

    const sidebar = page.locator("aside").first();
    const box = (await sidebar.boundingBox())!;
    expect(box.width).toBe(800);
    await expect(page.locator("aside").first().locator("> div")).toHaveCSS("position", "static");
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCSS("flex-direction", "row");

    const content = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(content!.y).toBeGreaterThan(box.y + box.height - 1);
    // No horizontal page scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      800,
    );
  });
});

test.describe("fidelity against the mock-up", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  const cases = [
    { persona: PERSONAS.waiter, path: "/orders", reference: "staff-orders", subtitle: 700 },
    { persona: PERSONAS.cashier, path: "/payments", reference: "staff-payments", subtitle: 700 },
    { persona: PERSONAS.manager, path: "/menu", reference: "staff-menu", subtitle: 700 },
  ] as const;

  for (const { persona, path, reference, subtitle } of cases) {
    test(`${reference}: sidebar and page header`, async ({ page }) => {
      await signInAs(page, persona);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await fontsReady(page);

      await expectMatchesReference(page, reference, { x: 0, y: 0, width: 240, height: 420 });
      await expectMatchesReference(page, reference, { x: 240, y: 0, width: subtitle, height: 100 });
    });
  }
});
