import { expect, test, type Page } from "@playwright/test";

import { expectElementMatchesReference } from "../visual/compare";
import { FakeApi, type FakeOptions } from "./fake-api";
import { PERSONAS, fontsReady, mockApi, signInAs, type Persona } from "./helpers";

test.use({ viewport: { width: 1360, height: 900 } });

// The mock-up's persona: Okello Peter creating orders. A manager account
// carries the same name so every button the mock-up shows is available.
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

const panel = (page: Page, heading: string) =>
  page.locator("section", {
    has: page.getByRole("heading", { name: heading, exact: true }),
  });

const board = (page: Page) => page.getByRole("table", { name: "Active orders" });

test.describe("fidelity against the mock-up", () => {
  test("panels match the staff-orders artboard", async ({ page }) => {
    await openOrders(page, OKELLO_AS_MANAGER);
    await expect(board(page).getByRole("row")).toHaveCount(8);

    // Reference rectangles measured from tests/visual/reference/staff-orders.png.
    await expectElementMatchesReference(page, panel(page, "Table"), "staff-orders", {
      x: 264,
      y: 112,
      width: 668,
      height: 206,
    });
    // The mock-up lists Steamed Rice before Chapati in its picker (its menu
    // screen has them the other way round); the app orders by menu id.
    await expectElementMatchesReference(
      page,
      panel(page, "Menu items"),
      "staff-orders",
      { x: 264, y: 342, width: 668, height: 362 },
      { maxRatio: 0.01 },
    );
    // The ticket shows "Draft" where the mock-up predicts "ORD-1047", and the
    // flex layout leaves it on a fractional x, which shifts glyph edges.
    await expectElementMatchesReference(
      page,
      panel(page, "New order"),
      "staff-orders",
      { x: 956, y: 112, width: 380, height: 577 },
      { maxRatio: 0.01 },
    );
  });

  test("the Active orders board matches the artboard apart from the Ready step", async ({
    page,
  }) => {
    await openOrders(page, OKELLO_AS_MANAGER);
    await expect(board(page).getByRole("row")).toHaveCount(8);
    // The mock-up offers "Mark served" on a preparing order; the API needs
    // "Mark ready" first (plan D6), so two buttons differ in their text.
    await expectElementMatchesReference(
      page,
      panel(page, "Active orders"),
      "staff-orders",
      {
        x: 264,
        y: 863,
        width: 1072,
        height: 573,
      },
      { maxRatio: 0.01 },
    );
  });

  test("the header chip counts free tables", async ({ page }) => {
    await openOrders(page, OKELLO_AS_MANAGER);
    await expect(page.getByText("5 of 12 tables free")).toBeVisible();
  });
});

test.describe("creating an order", () => {
  test("explains what is missing, then enables Place order", async ({ page }) => {
    await openOrders(page, PERSONAS.waiter);
    const place = page.getByRole("button", { name: "Place order" });
    await expect(place).toBeDisabled();
    await expect(page.getByText("Choose a table and add at least one item.")).toBeVisible();

    await page.getByRole("button", { name: "Table 6, 4 seats" }).click();
    await expect(page.getByText("Add at least one item.", { exact: true })).toBeVisible();
    await expect(page.getByText("Table 6", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^Add Rolex/ }).click();
    await page.getByRole("button", { name: /^Add Rolex/ }).click();
    await expect(page.getByText("×2")).toBeVisible();
    await expect(place).toBeEnabled();
    await expect(page.getByText("UGX 10,000", { exact: true }).first()).toBeVisible();
  });

  test("steppers change and remove lines; the total follows", async ({ page }) => {
    await openOrders(page, PERSONAS.waiter);
    await page.getByRole("button", { name: /^Add Chapati/ }).click();
    await page.getByRole("button", { name: "Add one Chapati" }).click();
    await expect(page.getByText("2 × UGX 2,000")).toBeVisible();
    await page.getByRole("button", { name: "Remove one Chapati" }).click();
    await page.getByRole("button", { name: "Remove one Chapati" }).click();
    await expect(
      page.getByText("No items yet. Pick dishes and drinks from the menu."),
    ).toBeVisible();
  });

  test("filters the picker by category", async ({ page }) => {
    await openOrders(page, PERSONAS.waiter);
    const categories = page.getByRole("group", { name: "Menu category" });
    await expect(categories.getByRole("button")).toHaveText([
      "All",
      "Mains",
      "Snacks",
      "Sides",
      "Drinks",
    ]);
    await categories.getByRole("button", { name: "Drinks" }).click();
    await expect(categories.getByRole("button", { name: "Drinks" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: /^Add Rolex/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Add Soda 300ml/ })).toBeVisible();
  });

  test("occupied tables cannot be picked", async ({ page }) => {
    await openOrders(page, PERSONAS.waiter);
    await expect(page.getByRole("button", { name: "Table 2, occupied" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Table 1, 2 seats" })).toBeEnabled();
  });

  test("places an order through the customer-session workaround", async ({ page }) => {
    const api = await openOrders(page, PERSONAS.waiter);
    await page.getByRole("button", { name: "Table 6, 4 seats" }).click();
    await page.getByRole("button", { name: /^Add Rolex/ }).click();
    await page.getByRole("button", { name: /^Add Rolex/ }).click();
    await page.getByLabel("Special instructions").fill("no onions");
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(
      page.getByText("Order ORD-1047 placed for Table 6. The kitchen can see it as pending."),
    ).toBeVisible();

    // What was sent.
    expect(api.callsTo("POST", "/api/staff/orders/")).toHaveLength(1);
    const customer = api.callsTo("POST", "/api/customers/")[0];
    expect(customer.body).toEqual({ table_id: 6 });
    const placed = api.callsTo("POST", "/api/my/orders/")[0];
    expect(placed.sessionToken).toBe("token-5000");
    expect(placed.body).toEqual({
      items: [{ menu_item_id: 6, quantity: 2, special_instructions: "no onions" }],
    });

    // The form resets and the board refreshes.
    await expect(page.getByText("Not chosen")).toBeVisible();
    await expect(page.getByLabel("Special instructions")).toHaveValue("");
    await expect(board(page).getByRole("cell", { name: "ORD-1047" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Database activity" })).toHaveCount(0);
    await expect(page.getByText(/ORDER_ITEMS:|TABLES:|ORDERS:/)).toHaveCount(0);
  });

  test("uses the staff endpoint once the backend has it", async ({ page }) => {
    const api = await openOrders(page, PERSONAS.waiter, { staffCreate: true });
    await page.getByRole("button", { name: "Table 1, 2 seats" }).click();
    await page.getByRole("button", { name: /^Add Chapati/ }).click();
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByText(/Order ORD-1047 placed for Table 1/)).toBeVisible();

    expect(api.callsTo("POST", "/api/staff/orders/")).toHaveLength(1);
    expect(api.callsTo("POST", "/api/customers/")).toHaveLength(0);
    expect(api.callsTo("POST", "/api/my/orders/")).toHaveLength(0);
  });

  test("shows the server's reason when an order is rejected", async ({ page }) => {
    await openOrders(page, PERSONAS.waiter, { placeError: "Not available right now: Rolex" });
    await page.getByRole("button", { name: "Table 6, 4 seats" }).click();
    await page.getByRole("button", { name: /^Add Rolex/ }).click();
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByRole("alert")).toHaveText("Error: Not available right now: Rolex");
    // The cart is kept so the waiter can adjust it.
    await expect(page.getByText("×1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Place order" })).toBeEnabled();
  });
});

test.describe("falling back without a tables endpoint", () => {
  test("derives occupancy from the orders it can see", async ({ page }) => {
    await openOrders(page, OKELLO_AS_MANAGER, { tablesEndpoint: false });
    // Seats are unknown, so tiles say Free or Occupied.
    await expect(page.getByRole("button", { name: "Table 2, occupied" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Table 1, free" })).toBeEnabled();
    await expect(page.getByText("5 of 12 tables free")).toBeVisible();
  });
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

    const served = board(page).getByRole("row", { name: /ORD-1045/ });
    await expect(served.getByText("Awaiting payment")).toBeVisible();
    await expect(served.getByRole("link")).toHaveCount(0);
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
