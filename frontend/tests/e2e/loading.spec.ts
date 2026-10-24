import { expect, test, type Page } from "@playwright/test";

import { FakeApi } from "./fake-api";
import { PERSONAS, signInAs, mockApi, loginResponse } from "./helpers";

test.use({ viewport: { width: 1360, height: 900 } });

/** Hold a real UI request until pending feedback has been checked, then optionally fail it. */
async function hold(page: Page, path: string, method: string, failure?: string) {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  page.once("close", release);
  await page.route(
    (url) => url.origin === "http://127.0.0.1:8000" && url.pathname === path,
    async (route) => {
      if (route.request().method() !== method) return route.fallback();
      const attempt = ++calls;
      await ready;
      if (failure && attempt === 1) {
        return route.fulfill({
          status: 503,
          headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
          body: JSON.stringify({ detail: failure }),
        });
      }
      return route.fallback();
    },
  );
  return { release, calls: () => calls };
}

async function staff(page: Page, role: keyof typeof PERSONAS, path: string) {
  const api = new FakeApi({
    tablesEndpoint: true,
    menuFeatures: { category: true, archived: true },
  });
  await api.install(page);
  await signInAs(page, PERSONAS[role]);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return api;
}

test("initial load, background refresh, and navigation keep loading distinct from content", async ({
  page,
}) => {
  await page.clock.install();
  await new FakeApi().install(page);
  await signInAs(page, PERSONAS.manager);
  const initial = await hold(page, "/api/staff/orders/", "GET");
  const opening = page.goto("/orders");
  await expect.poll(initial.calls).toBe(1);
  await expect(page.getByRole("status")).toHaveText("Loading…");
  initial.release();
  await opening;
  const orders = page.getByRole("table", { name: "Active orders" });
  await expect(orders).toBeVisible();

  const refresh = await hold(page, "/api/staff/orders/", "GET");
  await page.clock.runFor(10_000);
  await expect.poll(refresh.calls).toBe(1);
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");
  await expect(orders).toBeVisible();
  refresh.release();
  await expect(page.getByRole("main")).not.toHaveAttribute("aria-busy");

  const navigation = await hold(page, "/api/staff/orders/", "GET", "Queue unavailable. Try again.");
  await page.getByRole("link", { name: "Payments", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Loading Payments…");
  await expect(orders).toBeVisible();
  navigation.release();
  await expect(page.getByRole("alert")).toContainText("Queue unavailable");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
  await expect(page.getByText("Loading Payments…", { exact: true })).toHaveCount(0);
});

test("sign-in announces pending, prevents repeat submission, and retains failed credentials", async ({
  page,
}) => {
  await new FakeApi().install(page);
  await mockApi(page, "/api/auth/login/", () => ({ body: loginResponse(PERSONAS.cashier) }));
  const request = await hold(
    page,
    "/api/auth/login/",
    "POST",
    "Check your credentials and try again.",
  );
  await page.goto("/");
  await page.getByLabel("Username").fill(PERSONAS.cashier.username);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const pending = page.getByRole("button", { name: "Signing in…", exact: true });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await page.getByLabel("Password").press("Enter");
  await expect.poll(request.calls).toBe(1);
  request.release();
  await expect(page.getByRole("alert")).toContainText("Check your credentials");
  await expect(page.getByLabel("Username")).toHaveValue(PERSONAS.cashier.username);
  await expect(page.getByLabel("Password")).toHaveValue("secret123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/payments");
  expect(request.calls()).toBe(2);
});

test("status changes stay busy through the request and recover for retry", async ({ page }) => {
  await staff(page, "manager", "/orders");
  const request = await hold(
    page,
    "/api/staff/orders/1044/status/",
    "POST",
    "Could not update this order. Try again.",
  );
  const row = page.getByRole("row", { name: /ORD-1044/ });
  await row.getByRole("button", { name: "Start preparing" }).click();
  const pending = row.getByRole("button", { name: "Starting preparation…" });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await pending.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(request.calls).toBe(1);
  request.release();
  await expect(page.getByRole("alert")).toContainText("Could not update this order");
  await row.getByRole("button", { name: "Start preparing" }).click();
  await expect(row.getByText("Preparing", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Order ORD-1044 is now Preparing.");
  expect(request.calls()).toBe(2);
});

test("table opening and order submission show pending without duplicate orders", async ({
  page,
}) => {
  const api = new FakeApi({ tablesEndpoint: true, menuFeatures: { category: true } });
  await api.install(page);
  await page.goto("/station");
  const start = page.getByRole("button", { name: "Start order", exact: true });
  await expect(start).toBeDisabled();
  await expect(start).not.toHaveAttribute("aria-busy");
  const session = await hold(page, "/api/customers/", "POST");
  await page.getByRole("button", { name: "Table 6, 4 seats" }).click();
  await start.click();
  await expect(page.getByRole("button", { name: "Opening table…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Table 1, 2 seats" })).toBeDisabled();
  await expect.poll(session.calls).toBe(1);
  session.release();
  await page.getByRole("button", { name: /^Add Chicken Luwombo/ }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByLabel("Special instructions for the kitchen").fill("no onions");
  const request = await hold(page, "/api/my/orders/", "POST", "Order not sent. Try again.");
  await page.getByRole("button", { name: /^Send to kitchen/ }).click();
  const pending = page.getByRole("button", { name: "Sending order…" });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await expect(page.getByLabel("Special instructions for the kitchen")).toBeDisabled();
  await pending.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(request.calls).toBe(1);
  request.release();
  await expect(page.getByRole("alert")).toContainText("Order not sent");
  await expect(page.getByLabel("Special instructions for the kitchen")).toHaveValue("no onions");
  await expect(page.getByText("Chicken Luwombo", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Send to kitchen/ }).click();
  await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Order sent to the kitchen" }),
  ).toBeVisible();
  expect(api.callsTo("POST", "/api/my/orders/")).toHaveLength(1);
  expect(request.calls()).toBe(2); // One failed attempt and one successful order.
});

for (const method of ["Cash", "Mobile Money"] as const) {
  test(`${method} payment keeps input on failure and records only once after retry`, async ({
    page,
  }) => {
    const api = await staff(page, "cashier", "/payments");
    await page.getByRole("button", { name: /^ORD-1045/ }).click();
    if (method === "Cash") {
      await page.getByLabel("Amount received (UGX)").fill("100000");
    } else {
      await page.getByRole("radio", { name: /^Mobile money/ }).check({ force: true });
      await page.getByLabel("Network").selectOption("Airtel Money");
      await page.getByLabel("Customer phone number").fill("0752123456");
    }
    const request = await hold(
      page,
      "/api/staff/orders/1045/pay/",
      "POST",
      "Payment not recorded. Try again.",
    );
    await page.getByRole("button", { name: /^Record payment/ }).click();
    const pending = page.getByRole("button", { name: "Recording payment…" });
    await expect(pending).toBeDisabled();
    await expect(pending).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("button", { name: /^ORD-1042/ })).toBeDisabled();
    await pending.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect.poll(request.calls).toBe(1);
    expect(api.paid.size).toBe(0);
    request.release();
    await expect(page.getByRole("alert")).toContainText("Payment not recorded");
    if (method === "Cash") {
      await expect(page.getByLabel("Amount received (UGX)")).toHaveValue("100000");
    } else {
      await expect(page.getByLabel("Customer phone number")).toHaveValue("0752123456");
      await expect(page.getByLabel("Network")).toHaveValue("Airtel Money");
    }
    await page.getByRole("button", { name: /^Record payment/ }).click();
    await expect(page.getByText("Payment recorded", { exact: true })).toBeVisible();
    expect(api.callsTo("POST", "/api/staff/orders/1045/pay/")).toHaveLength(1);
    expect(request.calls()).toBe(2);
    expect(api.paid.has(1045)).toBe(true);
  });
}

test("saving menu changes locks conflicting controls and retains input for retry", async ({
  page,
}) => {
  await staff(page, "manager", "/menu");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Item name").fill("Roasted Maize");
  await page.getByLabel("Price (UGX)", { exact: true }).fill("4500");
  const request = await hold(page, "/api/staff/menu/", "POST", "Menu not saved. Try again.");
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  const pending = page.getByRole("button", { name: "Saving item…" });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await expect(page.getByLabel("Item name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add item", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Edit / }).first()).toBeDisabled();
  await pending.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(request.calls).toBe(1);
  request.release();
  await expect(page.getByRole("alert")).toContainText("Menu not saved");
  await expect(page.getByLabel("Item name")).toHaveValue("Roasted Maize");
  await expect(page.getByLabel("Price (UGX)", { exact: true })).toHaveValue("4500");
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Roasted Maize added");
  expect(request.calls()).toBe(2);
});

test("archiving menu items shows progress and blocks overlapping edits", async ({ page }) => {
  const api = await staff(page, "manager", "/menu");
  const request = await hold(page, "/api/staff/menu/1/", "DELETE");
  await page.getByRole("button", { name: "Archive Matoke & Beef Stew", exact: true }).click();
  const pending = page.getByRole("button", { name: "Archiving item…" });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("button", { name: "Edit Chicken Luwombo", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Archive Chicken Luwombo", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add item", exact: true })).toBeDisabled();
  await pending.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(request.calls).toBe(1);
  request.release();
  await expect(page.getByRole("status")).toContainText("Matoke & Beef Stew archived");
  expect(api.callsTo("DELETE", "/api/staff/menu/1/")).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Add item", exact: true })).toBeEnabled();
});
