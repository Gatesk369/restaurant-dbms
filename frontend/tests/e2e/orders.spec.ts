import { expect, test, type Page } from "@playwright/test";

import { FakeApi, type FakeOptions } from "./fake-api";
import { PERSONAS, fontsReady, mockApi, signInAs, type Persona } from "./helpers";

test.use({ viewport: { width: 1360, height: 900 } });

const OKELLO_AS_MANAGER: Persona = { ...PERSONAS.manager, display_name: "Okello Peter" };

async function openOrders(page: Page, persona: Persona, options: FakeOptions = {}) {
  const api = new FakeApi({ tablesEndpoint: true, ...options });
  await api.install(page);
  await signInAs(page, persona);
  await page.goto("/orders");
  await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
  await fontsReady(page);
  return api;
}

const board = (page: Page) => page.getByRole("table", { name: "Active orders" });

test.describe("customer-only order entry", () => {
  for (const persona of Object.values(PERSONAS)) {
    test(`${persona.role} gets the board without order entry or customer-session requests`, async ({
      page,
    }) => {
      const api = await openOrders(page, persona);
      await expect(board(page)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Database activity" })).toHaveCount(0);
      await expect(page.getByText(/ORDER_ITEMS:|TABLES:|ORDERS:/)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "New order" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Menu items" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Place order" })).toHaveCount(0);
      await expect(page.getByText(/tables free/)).toHaveCount(0);
      expect(api.callsTo("GET", "/api/staff/menu/")).toHaveLength(0);
      expect(api.callsTo("GET", "/api/tables/")).toHaveLength(0);
      expect(api.callsTo("POST", "/api/staff/orders/")).toHaveLength(0);
      expect(api.callsTo("POST", "/api/customers/")).toHaveLength(0);
      expect(api.callsTo("POST", "/api/my/orders/")).toHaveLength(0);
    });
  }
});

test.describe("the Active orders board", () => {
  test("shows filter counts and filters the rows", async ({ page }) => {
    await openOrders(page, OKELLO_AS_MANAGER);
    const filters = page.getByRole("group", { name: "Order status" });
    await expect(filters.getByRole("button")).toHaveText([
      "All (7)",
      "Pending (1)",
      "Preparing (2)",
      "Served (4)",
    ]);
    await filters.getByRole("button", { name: "Served (4)" }).click();
    await expect(board(page).getByRole("row")).toHaveCount(5);
    await expect(board(page).getByRole("cell", { name: "ORD-1044" })).toHaveCount(0);
  });

  test("describes each order and lists the newest first", async ({ page }) => {
    await openOrders(page, OKELLO_AS_MANAGER);
    const rows = board(page).getByRole("row");
    await expect(rows.nth(1)).toContainText("ORD-1046");
    await expect(rows.nth(1)).toContainText("Birungi Esther");
    await expect(rows.nth(1)).toContainText("Namukasa G.");
    await expect(rows.nth(1)).toContainText("1× Fried Tilapia & Chips, 1× Mango Juice");
    await expect(rows.nth(1)).toContainText("UGX 38,000");
    await expect(rows.nth(7)).toContainText("ORD-1039");
  });

  test("lets the manager move an order along with task feedback", async ({ page }) => {
    const api = await openOrders(page, OKELLO_AS_MANAGER);
    const row = board(page).getByRole("row", { name: /ORD-1044/ });
    await expect(row.getByText("Pending", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Start preparing" }).click();

    await expect(row.getByText("Preparing", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Mark ready" })).toBeVisible();
    expect(api.callsTo("POST", "/api/staff/orders/1044/status/")[0].body).toEqual({
      status: "preparing",
    });
    await expect(page.getByRole("status")).toHaveText("Order ORD-1044 is now Preparing.");
    await expect(page.getByRole("heading", { name: "Database activity" })).toHaveCount(0);
    await expect(page.getByText(/order_status|free_status/)).toHaveCount(0);

    await row.getByRole("button", { name: "Mark ready" }).click();
    await expect(row.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Order ORD-1044 is now Ready.");
    await expect(row.getByRole("button", { name: "Mark served" })).toBeVisible();
  });

  test("keeps actionable status errors without announcing success", async ({ page }) => {
    await openOrders(page, OKELLO_AS_MANAGER);
    await mockApi(page, "/api/staff/orders/1044/status/", () => ({
      status: 409,
      body: { detail: "This order has already changed. Refresh and try again." },
    }));
    const row = board(page).getByRole("row", { name: /ORD-1044/ });
    await row.getByRole("button", { name: "Start preparing" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Error: This order has already changed. Refresh and try again.",
    );
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(row.getByText("Pending", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Start preparing" })).toBeEnabled();
  });

  test("offers a served order to the cashier role as a payment link", async ({ page }) => {
    await openOrders(page, OKELLO_AS_MANAGER);
    const row = board(page).getByRole("row", { name: /ORD-1045/ });
    await expect(row.getByRole("link", { name: "Take payment" })).toHaveAttribute(
      "href",
      "/payments",
    );
  });

  test("hides served orders from earlier days when paid state is unknown", async ({ page }) => {
    const api = new FakeApi({ tablesEndpoint: true });
    const yesterday = new Date(Date.now() - 36 * 3_600_000).toISOString();
    api.orders = api.orders.map((o) => (o.order_id === 1039 ? { ...o, order_time: yesterday } : o));
    await api.install(page);
    await signInAs(page, OKELLO_AS_MANAGER);
    await page.goto("/orders");
    await expect(board(page).getByRole("cell", { name: "ORD-1045" })).toBeVisible();
    await expect(board(page).getByRole("cell", { name: "ORD-1039" })).toHaveCount(0);
  });
});

test.describe("each role sees only what it can do", () => {
  test("wait staff see their own ready order's button, not the kitchen's", async ({ page }) => {
    const api = new FakeApi({ tablesEndpoint: true });
    api.orders = api.orders.map((o) =>
      o.order_id === 1043
        ? { ...o, order_status: "ready" as const, staff_id: PERSONAS.waiter.staff_id }
        : o.order_id === 1044
          ? { ...o, staff_id: PERSONAS.waiter.staff_id }
          : o,
    );
    await api.install(page);
    await signInAs(page, PERSONAS.waiter);
    await page.goto("/orders");

    const own = board(page).getByRole("row", { name: /ORD-1043/ });
    await expect(own.getByRole("button", { name: "Mark served" })).toBeVisible();

    const confirmed = board(page).getByRole("row", { name: /ORD-1044/ });
    await expect(confirmed.getByRole("button")).toHaveCount(0);
    await expect(confirmed.getByText("Waiting for the kitchen")).toBeVisible();

    await expect(board(page).getByRole("row", { name: /ORD-1046/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Assigned orders" })).toBeVisible();
    await own.getByRole("button", { name: "Mark served" }).click();
    await expect(own.getByText("Awaiting payment")).toBeVisible();
    await expect(own.getByRole("link")).toHaveCount(0);
    expect(api.callsTo("POST", "/api/staff/orders/1043/status/")[0].body).toEqual({
      status: "served",
    });
  });

  test("kitchen staff get the board and the kitchen buttons only", async ({ page }) => {
    await openOrders(page, PERSONAS.kitchen);
    await expect(page.getByRole("heading", { name: "Table", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Place order" })).toHaveCount(0);
    await expect(page.getByText(/tables free/)).toHaveCount(0);
    await expect(
      board(page)
        .getByRole("row", { name: /ORD-1044/ })
        .getByRole("button", { name: "Start preparing" }),
    ).toBeVisible();
    await expect(
      board(page)
        .getByRole("row", { name: /ORD-1046/ })
        .getByRole("button", { name: "Mark ready" }),
    ).toBeVisible();
  });

  test("cashiers get the board with payment links", async ({ page }) => {
    await openOrders(page, PERSONAS.cashier);
    await expect(page.getByRole("button", { name: "Place order" })).toHaveCount(0);
    await expect(
      board(page)
        .getByRole("row", { name: /ORD-1045/ })
        .getByRole("link", { name: "Take payment" }),
    ).toBeVisible();
    await expect(
      board(page)
        .getByRole("row", { name: /ORD-1044/ })
        .getByRole("button"),
    ).toHaveCount(0);
  });
});

test("assigned orders show special instructions and an empty state for unassigned waiters", async ({
  page,
}) => {
  const api = new FakeApi();
  api.orders = api.orders.map((o) => ({
    ...o,
    staff_id: PERSONAS.waiter.staff_id,
    items: o.items.map((item) => ({ ...item, special_instructions: "No onions" })),
  }));
  await api.install(page);
  await signInAs(page, PERSONAS.waiter);
  await page.goto("/orders");
  await expect(
    board(page)
      .getByText(/No onions/)
      .first(),
  ).toBeVisible();
  api.orders = api.orders.map((o) => ({ ...o, staff_id: 9999 }));
  await page.reload();
  await expect(page.getByText(/No assigned orders match this filter/)).toBeVisible();
  await expect(board(page).getByRole("row")).toHaveCount(1);
});

test.describe("when the session ends", () => {
  test("returns to sign-in and says why", async ({ page }) => {
    await openOrders(page, PERSONAS.waiter).catch(() => undefined);
    const api = new FakeApi({ expired: true });
    await page.unrouteAll();
    await api.install(page);
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/\?reason=expired$/);
    await expect(page.getByText("Your session has ended. Sign in again.")).toBeVisible();
  });
});
