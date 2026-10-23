import { expect, test, type Page } from "@playwright/test";

import { expectMatchesReference } from "../visual/compare";
import { FakeApi } from "./fake-api";
import { PERSONAS, fontsReady, loginResponse, mockApi } from "./helpers";

test.use({ viewport: { width: 1360, height: 780 } });

const ARTBOARD = { x: 0, y: 0, width: 1360, height: 780 };

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
  test("matches the mock-up artboard", async ({ page }) => {
    await open(page);
    // The mock-up opens with the Cashier demo account typed in.
    await fill(page, "nakato.sarah", "secret123");
    await blur(page);
    await expectMatchesReference(page, "staff-sign-in", ARTBOARD);
  });

  test("matches the mock-up error state", async ({ page }) => {
    await open(page);
    await page.getByRole("radio", { name: /^Manager/ }).check({ force: true });
    await fill(page, "tumusiime.ruth", "abc");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await blur(page);
    await expectMatchesReference(page, "staff-sign-in-error", ARTBOARD);
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

test.describe("startup menu", () => {
  const roles = [
    {
      persona: PERSONAS.cashier,
      card: /^Cashier/,
      slug: "cashier",
      links: ["Orders", "Payments"],
      locked: ["Menu management", "Reports"],
      label: "Cashier",
    },
    {
      persona: PERSONAS.waiter,
      card: /^Wait Staff/,
      slug: "wait-staff",
      links: ["Orders"],
      locked: ["Payments", "Menu management", "Reports"],
      label: "Wait Staff",
    },
    {
      persona: PERSONAS.kitchen,
      card: /^Kitchen Staff/,
      slug: "kitchen",
      links: ["Orders"],
      locked: ["Payments", "Menu management", "Reports"],
      label: "Kitchen Staff",
    },
    {
      persona: PERSONAS.manager,
      card: /^Manager/,
      slug: "manager",
      links: ["Orders", "Payments", "Menu management", "Reports"],
      locked: [],
      label: "Manager",
    },
  ] as const;

  for (const { persona, card, slug, links, locked, label } of roles) {
    test(`${label}: tiles and artboard`, async ({ page }) => {
      await mockApi(page, "/api/auth/login/", () => ({ body: loginResponse(persona) }));
      await open(page);
      await page.getByRole("radio", { name: card }).check({ force: true });
      await fill(page, persona.username, "secret123");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByRole("heading", { level: 2, name: "Startup menu" })).toBeVisible();
      await expect(page.getByText(`Signed in as ${persona.display_name}, ${label}`)).toBeVisible();

      const main = page.locator("main");
      for (const name of links) {
        await expect(main.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
      }
      await expect(main.getByRole("link")).toHaveCount(links.length);
      for (const name of locked) {
        await expect(main.getByText(name, { exact: true })).toHaveCount(0);
      }

      await fontsReady(page);
      await blur(page);
      await expect(main.getByText(/Locked for/)).toHaveCount(0);
      await page.mouse.move(0, 0);
      if (persona.role === "manager") {
        await expectMatchesReference(page, `staff-startup-${slug}`, ARTBOARD);
      } else {
        // Preserve mock-ups; #36 removes the locked tiles from these layouts.
        await expect(page).toHaveScreenshot(`staff-startup-${slug}.png`, {
          animations: "disabled",
        });
      }
    });
  }

  test("keeps the session across a reload and signs out from the menu", async ({ page }) => {
    await mockApi(page, "/api/auth/login/", () => ({ body: loginResponse(PERSONAS.cashier) }));
    await open(page);
    await fill(page, "nakato.sarah", "secret123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Startup menu" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Startup menu" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Sign in" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("rdbms.staff"))).toBeNull();
  });

  test("continues into the staff shell as the signed-in user", async ({ page }) => {
    // Registered first so the more specific login route below wins.
    await new FakeApi({ tablesEndpoint: true }).install(page);
    await mockApi(page, "/api/auth/login/", () => ({ body: loginResponse(PERSONAS.waiter) }));
    await open(page);
    await fill(page, "okello.peter", "secret123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("link", { name: /^Orders/ }).click();

    await expect(page).toHaveURL(/\/orders$/);
    const sidebar = page.locator("aside").first();
    await expect(sidebar.getByText("Okello Peter")).toBeVisible();
    await expect(sidebar.getByText("Wait Staff")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
  });
});
