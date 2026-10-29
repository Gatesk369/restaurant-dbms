import { expect, test, type Page } from "@playwright/test";

import { FakeApi } from "./fake-api";
import { PERSONAS, fontsReady, loginResponse, mockApi, signInAs } from "./helpers";

test.use({ viewport: { width: 1360, height: 780 } });

async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
  await fontsReady(page);
}

async function fill(page: Page, username: string, password: string) {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
}

/** Drop focus so no caret or ring is in the comparison. */
async function blur(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

test.describe("sign-in form", () => {
  test("matches the direct-entry form baseline", async ({ page }) => {
    await open(page);
    // The mock-up opens with the Cashier demo account typed in.
    await fill(page, "nakato.sarah", "secret123");
    await blur(page);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot("staff-sign-in.png", { animations: "disabled" });
  });

  test("matches the direct-entry error baseline", async ({ page }) => {
    await open(page);
    await page.getByRole("radio", { name: /^Manager/ }).check({ force: true });
    await fill(page, "tumusiime.ruth", "abc");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await blur(page);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot("staff-sign-in-error.png", { animations: "disabled" });
  });

  test("uses the design-system metrics", async ({ page }) => {
    await open(page);
    const card = page.locator("main").locator("..");
    await expect(card).toHaveCSS("border-radius", "16px");
    await expect(card).toHaveCSS("border-top-color", "rgb(228, 219, 196)");
    await expect(page.locator("aside")).toHaveCSS("background-color", "rgb(24, 68, 42)");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "36px");
    await expect(page.getByRole("heading", { level: 2 })).toHaveCSS("font-size", "32px");

    const cashier = page.locator("label", { has: page.getByRole("radio", { name: /^Cashier/ }) });
    await expect(cashier).toHaveCSS("background-color", "rgb(69, 100, 74)");
    await expect(cashier).toHaveCSS("min-height", "60px");

    const submit = page.getByRole("button", { name: "Sign in" });
    await expect(submit).toHaveCSS("min-height", "48px");
    await expect(submit).toHaveCSS("min-width", "160px");
    await expect(page.getByLabel("Username")).toHaveCSS("min-height", "48px");
  });

  test("submits with Enter and shows the credential rule first", async ({ page }) => {
    await open(page);
    await page.getByLabel("Username").fill("okello.peter");
    await page.getByLabel("Password").fill("");
    await page.getByLabel("Password").press("Enter");
    await expect(page.getByRole("alert")).toHaveText(
      "Error: enter your username and a password of at least 4 characters.",
    );
  });

  test("shows the server's reason for a rejected sign-in and stores nothing", async ({ page }) => {
    await mockApi(page, "/api/auth/login/", () => ({
      status: 401,
      body: { detail: "Invalid username or password." },
    }));
    await open(page);
    await fill(page, "okello.peter", "wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toHaveText("Error: Invalid username or password.");
    await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("rdbms.staff"))).toBeNull();
  });

  test("stacks the brand panel above the form on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await open(page);
    const aside = (await page.locator("aside").boundingBox())!;
    const form = (await page.locator("main").boundingBox())!;
    expect(form.y).toBeGreaterThanOrEqual(aside.y + aside.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      600,
    );
  });
});

test.describe("direct workspace entry", () => {
  const roles = [
    { persona: PERSONAS.cashier, card: /^Cashier/, path: "/payments", heading: "Payments" },
    { persona: PERSONAS.waiter, card: /^Wait Staff/, path: "/orders", heading: "Orders" },
    { persona: PERSONAS.kitchen, card: /^Kitchen Staff/, path: "/orders", heading: "Orders" },
    { persona: PERSONAS.manager, card: /^Manager/, path: "/orders", heading: "Orders" },
  ] as const;

  for (const { persona, card, path, heading } of roles) {
    test(`${persona.role} signs in directly to ${path}`, async ({ page }) => {
      await new FakeApi({ tablesEndpoint: true }).install(page);
      await mockApi(page, "/api/auth/login/", () => ({ body: loginResponse(persona) }));
      await open(page);
      await page.getByRole("radio", { name: card }).check({ force: true });
      await fill(page, persona.username, "secret123");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Startup menu" })).toHaveCount(0);
      await expect(page.locator("aside").first().getByText(persona.display_name)).toBeVisible();
    });

    test(`${persona.role} returns from root to ${path} with its session`, async ({ page }) => {
      await new FakeApi({ tablesEndpoint: true }).install(page);
      await signInAs(page, persona);
      await page.goto("/?next=/reports");
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { name: "Startup menu" })).toHaveCount(0);
    });

    test(`${persona.role} expired session reaches sign-in without a loop`, async ({ page }) => {
      const api = new FakeApi({ tablesEndpoint: true, expired: true });
      await api.install(page);
      await signInAs(page, persona);
      await page.goto("/");
      await expect(page).toHaveURL(/\/\?reason=expired$/);
      await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
      await expect(page.getByText("Your session has ended. Sign in again.")).toBeVisible();
      expect(await page.evaluate(() => sessionStorage.getItem("rdbms.staff"))).toBeNull();
      expect(api.callsTo("GET", "/api/staff/orders/")).toHaveLength(1);
    });
  }

  test("uses the authenticated role instead of a selected role or forbidden return URL", async ({
    page,
  }) => {
    await new FakeApi({ tablesEndpoint: true }).install(page);
    await mockApi(page, "/api/auth/login/", () => ({ body: loginResponse(PERSONAS.cashier) }));
    await page.goto("/?next=/reports&returnTo=https://example.com");
    await page.getByRole("radio", { name: /^Manager/ }).check({ force: true });
    await fill(page, PERSONAS.cashier.username, "secret123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/payments");
    await expect(page.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
  });

  test("signs out from the workspace and stays signed out after a reload", async ({ page }) => {
    await new FakeApi({ tablesEndpoint: true }).install(page);
    await mockApi(page, "/api/auth/login/", () => ({ body: loginResponse(PERSONAS.cashier) }));
    await open(page);
    await fill(page, PERSONAS.cashier.username, "secret123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/payments");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");
    expect(await page.evaluate(() => sessionStorage.getItem("rdbms.staff"))).toBeNull();
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
  });
});
