import { expect, test, type Page } from "@playwright/test";

import { expectElementMatchesReference } from "../visual/compare";
import { FakeApi, type FakeOptions } from "./fake-api";
import { PERSONAS, fontsReady, signInAs, type Persona } from "./helpers";

test.use({ viewport: { width: 1360, height: 900 } });

async function openPayments(
  page: Page,
  persona: Persona = PERSONAS.cashier,
  options: FakeOptions = {},
) {
  const api = new FakeApi({ tablesEndpoint: true, queueView: "cashier", ...options });
  await api.install(page);
  await signInAs(page, persona);
  await page.goto("/payments");
  if (persona.role === "wait_staff" || persona.role === "kitchen") {
    await expect(page).toHaveURL(/\/orders$/);
  } else {
    await expect(page.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
  }
  await fontsReady(page);
  return api;
}

const queue = (page: Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "Served orders" }) });
const checkout = (page: Page) =>
  page.locator("section", { has: page.getByRole("table", { name: "Order items" }) });
const receiptPanel = (page: Page) =>
  page.locator("section", { has: page.getByText("Payment recorded", { exact: true }) });
const record = (page: Page) => page.getByRole("button", { name: /^Record payment/ });

async function pickOrder(page: Page, orderNo: number) {
  await queue(page)
    .getByRole("button", { name: new RegExp(`^ORD-${orderNo}`) })
    .click();
  await expect(page.getByRole("heading", { name: new RegExp(`^ORD-${orderNo}`) })).toBeVisible();
}

test.describe("fidelity against the mock-up", () => {
  test("queue and checkout match the artboard", async ({ page }) => {
    await openPayments(page);
    await pickOrder(page, 1045); // the artboard shows ORD-1045 selected

    await expectElementMatchesReference(page, queue(page), "staff-payments", {
      x: 264,
      y: 112,
      width: 389,
      height: 350,
    });
    await expectElementMatchesReference(page, checkout(page), "staff-payments", {
      x: 677,
      y: 112,
      width: 659,
      height: 732,
    });
  });

  test("cash states match: short of the total, then change due", async ({ page }) => {
    await openPayments(page);
    await pickOrder(page, 1045);

    await record(page).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expectElementMatchesReference(page, checkout(page), "staff-payments-cash-error", {
      x: 677,
      y: 112,
      width: 659,
      height: 764,
    });

    await page.getByLabel("Amount received (UGX)").fill("100000");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expectElementMatchesReference(page, checkout(page), "staff-payments-cash-change", {
      x: 677,
      y: 112,
      width: 659,
      height: 732,
    });
  });

  test("mobile money invalid number and the receipt match", async ({ page }) => {
    await openPayments(page);
    await pickOrder(page, 1045);

    await page.getByRole("radio", { name: /^Mobile money/ }).check({ force: true });
    await page.getByLabel("Customer phone number").fill("0772");
    await record(page).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expectElementMatchesReference(page, checkout(page), "staff-payments-momo-error", {
      x: 677,
      y: 112,
      width: 659,
      height: 728,
    });

    await page.getByLabel("Customer phone number").fill("0772123456");
    await record(page).click();
    await expect(page.getByText("Payment recorded", { exact: true })).toBeVisible();
    await expect(receiptPanel(page).getByRole("link", { name: "See sales report" })).toHaveCount(0);
    await expect(receiptPanel(page)).toHaveScreenshot("cashier-receipt.png", {
      animations: "disabled",
    });
    await expectElementMatchesReference(page, queue(page), "staff-payments-receipt", {
      x: 264,
      y: 112,
      width: 389,
      height: 278,
    });
  });
});

test.describe("the queue", () => {
  test("lists served orders oldest first and opens the first one", async ({ page }) => {
    await openPayments(page);
    await expect(page.getByText("4 awaiting payment")).toBeVisible();
    await expect(page.getByText("Received this session UGX 0")).toBeVisible();

    const buttons = queue(page).getByRole("button");
    await expect(buttons).toHaveCount(4);
    await expect(buttons.nth(0)).toContainText("ORD-1039 · Table 5");
    await expect(buttons.nth(0)).toContainText("UGX 72,000");
    await expect(buttons.nth(3)).toContainText("ORD-1045 · Table 7");
    await expect(buttons.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: /^ORD-1039 · Table 5/ })).toBeVisible();
    await expect(page.getByText("Total due").locator("..")).toContainText("UGX 72,000");
  });

  test("shows the order's lines and resets the form when another is chosen", async ({ page }) => {
    await openPayments(page);
    await page.getByLabel("Amount received (UGX)").fill("5000");
    await record(page).click();
    await expect(page.getByRole("alert")).toBeVisible();

    await pickOrder(page, 1041);
    const lines = page.getByRole("table", { name: "Order items" });
    await expect(lines.getByRole("row")).toHaveCount(5);
    await expect(lines).toContainText("Fried Tilapia & Chips");
    await expect(page.getByLabel("Amount received (UGX)")).toHaveValue("");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test.describe("recording a cash payment", () => {
  test("quick amounts fill the field and show the change", async ({ page }) => {
    await openPayments(page);
    await pickOrder(page, 1045); // UGX 60,000
    await page.getByRole("button", { name: "UGX 100,000" }).click();
    await expect(page.getByLabel("Amount received (UGX)")).toHaveValue("100000");
    await expect(page.getByText("Change due").locator("..")).toContainText("UGX 40,000");
    await page.getByRole("button", { name: "Exact amount" }).click();
    await expect(page.getByLabel("Amount received (UGX)")).toHaveValue("60000");
    await expect(page.getByText("Change due").locator("..")).toContainText("UGX 0");
  });

  test("refuses a short amount without calling the API, then clears on edit", async ({ page }) => {
    const api = await openPayments(page);
    await pickOrder(page, 1045);
    await page.getByLabel("Amount received (UGX)").fill("39000");
    await record(page).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Error: UGX 21,000 short of the total. Ask for the full amount.",
    );
    await expect(page.getByLabel("Amount received (UGX)")).toHaveAttribute("aria-invalid", "true");
    expect(api.callsTo("POST", "/api/staff/orders/1045/pay/")).toHaveLength(0);

    await page.getByLabel("Amount received (UGX)").fill("60000");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("records the payment and shows the receipt without database details", async ({ page }) => {
    const api = await openPayments(page);
    await pickOrder(page, 1045);
    await page.getByLabel("Amount received (UGX)").fill("100000");
    await record(page).click();

    await expect(page.getByText("Payment recorded", { exact: true })).toBeVisible();
    await expect(page.getByText("PAY-0388 for ORD-1045")).toBeVisible();
    const receipt = receiptPanel(page);
    await expect(receipt).toContainText("Table 7 is free again");
    await expect(receipt).toContainText("Cash");
    await expect(receipt).toContainText("UGX 60,000");
    await expect(receipt).toContainText("UGX 40,000");
    await expect(receipt).toContainText("Nakato Sarah, Cashier");

    // The amount is never sent; the server adds up the stored subtotals.
    const sent = api.callsTo("POST", "/api/staff/orders/1045/pay/");
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toEqual({ payment_method: "Cash" });

    await expect(page.getByRole("heading", { name: "Database activity" })).toHaveCount(0);
    await expect(page.getByText(/SALES_RECORD:|TABLES:|PAYMENTS:|free_status/)).toHaveCount(0);
    // Payment feedback does not depend on an extra tables fetch for a UI log.
    expect(api.callsTo("GET", "/api/tables/")).toHaveLength(0);

    await expect(page.getByText("3 awaiting payment")).toBeVisible();
    await expect(page.getByText("Received this session UGX 60,000")).toBeVisible();
  });

  test("moves on to the next order", async ({ page }) => {
    await openPayments(page);
    await pickOrder(page, 1045);
    await page.getByRole("button", { name: "Exact amount" }).click();
    await record(page).click();
    await page.getByRole("button", { name: "Next order" }).click();

    await expect(page.getByRole("heading", { name: /^ORD-1039/ })).toBeVisible();
    await expect(page.getByLabel("Amount received (UGX)")).toHaveValue("");
    await expect(queue(page).getByRole("button", { name: /ORD-1045/ })).toHaveCount(0);
  });

  test("keeps the session total when you leave and come back", async ({ page }) => {
    await openPayments(page);
    await page.getByRole("button", { name: "Exact amount" }).click();
    await record(page).click();
    await expect(page.getByText("Received this session UGX 72,000")).toBeVisible();

    await page.getByRole("link", { name: "Orders", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
    await page.getByRole("link", { name: "Payments", exact: true }).click();
    await expect(page.getByText("Received this session UGX 72,000")).toBeVisible();
  });
});

test.describe("recording a mobile-money payment", () => {
  test("validates the number, sends only the method, and prints the network", async ({ page }) => {
    const api = await openPayments(page);
    await pickOrder(page, 1042); // UGX 46,000
    await page.getByRole("radio", { name: /^Mobile money/ }).check({ force: true });
    await expect(page.getByLabel("Network")).toHaveValue("MTN Mobile Money");
    await page.getByLabel("Network").selectOption("Airtel Money");

    await page.getByLabel("Customer phone number").fill("12345");
    await record(page).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Error: enter a 10-digit number that starts with 07.",
    );
    await expect(page.getByLabel("Customer phone number")).toHaveAttribute("aria-invalid", "true");
    expect(api.callsTo("POST", "/api/staff/orders/1042/pay/")).toHaveLength(0);

    await page.getByLabel("Customer phone number").fill("0772 123 456");
    await record(page).click();
    await expect(page.getByText("PAY-0388 for ORD-1042")).toBeVisible();
    await expect(receiptPanel(page)).toContainText("Airtel Money");
    await expect(receiptPanel(page)).toContainText("Change given");
    expect(api.callsTo("POST", "/api/staff/orders/1042/pay/")[0].body).toEqual({
      payment_method: "Mobile Money",
    });
  });
});

test.describe("edge cases", () => {
  test("offers Back to orders after the last payment, then the all-paid panel", async ({
    page,
  }) => {
    const only = new FakeApi({ tablesEndpoint: true, queueView: "cashier" });
    only.orders = only.orders.filter((o) => o.order_id === 1045);
    await only.install(page);
    await signInAs(page, PERSONAS.cashier);
    await page.goto("/payments");
    await page.getByRole("button", { name: "Exact amount" }).click();
    await record(page).click();

    await expect(page.getByRole("link", { name: "Back to orders" })).toHaveAttribute(
      "href",
      "/orders",
    );
    await expect(page.getByRole("link", { name: "See sales report" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Next order" })).toHaveCount(0);
  });

  test("says so when nothing is waiting", async ({ page }) => {
    const none = new FakeApi({ tablesEndpoint: true, queueView: "cashier", orders: [] });
    await none.install(page);
    await signInAs(page, PERSONAS.cashier);
    await page.goto("/payments");

    await expect(
      page.getByText(
        "Nothing to collect. Orders appear here when the assigned waiter marks them served.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "All served orders are paid" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to orders" })).toHaveAttribute(
      "href",
      "/orders",
    );
    await expect(page.getByText("0 awaiting payment")).toBeVisible();
  });

  for (const persona of [PERSONAS.cashier, PERSONAS.manager]) {
    test(`${persona.role} empty payment queue offers only permitted navigation`, async ({
      page,
    }) => {
      await openPayments(page, persona, { orders: [] });
      await expect(page.getByRole("heading", { name: "All served orders are paid" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Go to orders" })).toHaveAttribute(
        "href",
        "/orders",
      );
      await expect(page.getByRole("link", { name: "See sales report" })).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link")).toHaveText(
        persona.role === "cashier"
          ? ["Orders", "Payments"]
          : ["Orders", "Payments", "Menu", "Reports"],
      );
    });
  }

  test("shows the server's reason when the order was already paid", async ({ page }) => {
    await openPayments(page, PERSONAS.cashier, {
      payError: { status: 409, detail: "This order has already been paid." },
    });
    await page.getByRole("button", { name: "Exact amount" }).click();
    await record(page).click();
    await expect(page.getByRole("alert")).toHaveText("Error: This order has already been paid.");
    await expect(record(page)).toBeEnabled();
    await expect(page.getByText("Payment recorded")).toHaveCount(0);
  });

  test("a manager can see the queue but not record payments", async ({ page }) => {
    await openPayments(page, PERSONAS.manager, { queueView: "all" });
    // The manager's queue is every served order from today (no paid flag yet).
    await expect(queue(page).getByRole("button")).toHaveCount(4);
    await expect(record(page)).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Payment method" })).toHaveCount(0);
    await expect(checkout(page).getByRole("table", { name: "Order items" })).toBeVisible();
  });

  test("redirects wait staff to Orders without displaying checkout", async ({ page }) => {
    await openPayments(page, PERSONAS.waiter);
    await expect(page).toHaveURL(/\/orders$/);
    await expect(record(page)).toHaveCount(0);
    await expect(page.getByText(/Locked for/)).toHaveCount(0);
  });
});
