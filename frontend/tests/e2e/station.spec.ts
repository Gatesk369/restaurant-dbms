import { expect, test, type Page } from "@playwright/test";

import { FakeApi, type FakeOptions } from "./fake-api";
import { PERSONAS, fontsReady, signInAs } from "./helpers";

test.use({ viewport: { width: 1280, height: 800 } });

/** The API as it will be once backend issues #12 and #13 are done. */
const FULL: FakeOptions = {
  tablesEndpoint: true,
  publicMenuSoldOut: true,
  menuFeatures: { category: true, archived: true },
};

async function openStation(page: Page, options: FakeOptions = FULL, install = false) {
  const api = new FakeApi(options);
  await api.install(page);
  if (install) await page.clock.install();
  await page.goto("/station");
  await expect(page.getByRole("heading", { name: "Order from your table" })).toBeVisible();
  await fontsReady(page);
  return api;
}

const table = (page: Page, n: number, seats = 4) =>
  page.getByRole("button", { name: `Table ${n}, ${seats} seats` });
const add = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^Add ${name}`) });
const start = (page: Page) => page.getByRole("button", { name: "Start order" });
const send = (page: Page) => page.getByRole("button", { name: /^Send to kitchen/ });

/** Drop focus and the pointer so neither is in a screenshot. */
async function settle(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(100);
}

async function toMenu(page: Page, n = 6) {
  await table(page, n).click();
  await start(page).click();
  await expect(page.getByRole("heading", { name: "Mains", level: 2 })).toBeVisible();
}

async function toReview(page: Page) {
  await toMenu(page);
  await add(page, "Matoke & Beef Stew").click();
  await add(page, "Chicken Luwombo").click();
  await add(page, "Matoke & Beef Stew").click();
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("heading", { name: "Check your order" })).toBeVisible();
}

test.describe("responsive ordering appearance", () => {
  test("walks the four steps with cashier-only payment selection", async ({ page }) => {
    await openStation(page);
    await expect(page.getByLabel("Your name (optional)")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Call a waiter" })).toHaveCount(0);
    await settle(page);
    await expect(page).toHaveScreenshot("responsive-station-1-table.png");

    await toMenu(page);
    await expect(page.getByRole("button", { name: "Grilled Goat Ribs, sold out" })).toBeDisabled();
    await settle(page);
    // SVG data-URI initials use system fallback fonts. CI artifacts show 452
    // differing pixels confined to those initials; keep this allowance local.
    await expect(page).toHaveScreenshot("responsive-station-2-menu-empty.png", {
      maxDiffPixels: 452,
    });

    await add(page, "Matoke & Beef Stew").click();
    await add(page, "Chicken Luwombo").click();
    await add(page, "Matoke & Beef Stew").click();
    await expect(page.getByText("×2")).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("responsive-station-2-menu-cart.png", {
      maxDiffPixels: 452,
    });

    await page.getByRole("button", { name: "Review order" }).click();
    await expect(page.getByRole("heading", { name: "Check your order" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("station-review.png");

    await send(page).click();
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("station-done-pending.png");

    await page.getByRole("button", { name: /Prototype only/ }).click();
    await settle(page);
    // Both CI runs reported a stable five-pixel difference for this baseline.
    await expect(page).toHaveScreenshot("station-done-preparing.png", { maxDiffPixels: 5 });
  });
});

test.describe("choosing a table", () => {
  test("needs a table before the order can start", async ({ page }) => {
    await openStation(page);
    await expect(start(page)).toBeDisabled();
    await expect(page.getByText("Choose a table to continue.")).toBeVisible();

    await table(page, 6).click();
    await expect(start(page)).toBeEnabled();
    await expect(page.getByText("Table 6 selected.")).toBeVisible();
    await expect(table(page, 6)).toHaveAttribute("aria-pressed", "true");
  });

  test("shows tables in use as disabled", async ({ page }) => {
    await openStation(page);
    await expect(page.getByRole("button", { name: "Table 2, in use" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Table 9, in use" })).toBeDisabled();
    await expect(page.getByText("Tables marked In use already have an order open.")).toBeVisible();
  });

  test("offers every configured table while the API cannot list them", async ({ page }) => {
    await openStation(page, { publicMenuSoldOut: true });
    // No seats and no occupancy are known, so tiles say Free.
    await expect(page.getByRole("button", { name: "Table 2, free" })).toBeEnabled();
    await expect(page.getByRole("button", { name: /^Table \d+, free$/ })).toHaveCount(12);
  });

  test("opens one session for the table and keeps it when changing back", async ({ page }) => {
    const api = await openStation(page);
    await toMenu(page);
    expect(api.callsTo("POST", "/api/customers/")).toHaveLength(1);
    expect(api.callsTo("POST", "/api/customers/")[0].body).toEqual({ table_id: 6 });

    await page.getByRole("button", { name: "Change table" }).click();
    await expect(table(page, 6)).toHaveAttribute("aria-pressed", "true");
    await start(page).click();
    await expect(page.getByRole("heading", { name: "Mains", level: 2 })).toBeVisible();
    expect(api.callsTo("POST", "/api/customers/")).toHaveLength(1);

    // A different table needs its own session.
    await page.getByRole("button", { name: "Change table" }).click();
    await table(page, 1, 2).click();
    await start(page).click();
    await expect(page.getByRole("heading", { name: "Mains", level: 2 })).toBeVisible();
    expect(api.callsTo("POST", "/api/customers/")).toHaveLength(2);
  });

  test("reports why a table could not be opened", async ({ page }) => {
    await openStation(page);
    await page.route("http://127.0.0.1:8000/api/customers/", (route) => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({
          status: 204,
          headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
        });
      }
      return route.fulfill({
        status: 400,
        headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
        body: JSON.stringify({ table_id: "That table doesn't exist." }),
      });
    });
    await table(page, 6).click();
    await start(page).click();
    await expect(page.getByRole("alert")).toHaveText("Error: That table doesn't exist.");
    await expect(page.getByRole("heading", { name: "Order from your table" })).toBeVisible();
  });
});

test.describe("the menu", () => {
  test("switches categories and marks items already in the cart", async ({ page }) => {
    await openStation(page);
    await toMenu(page);
    const rail = page.getByRole("navigation", { name: "Menu categories" });
    await expect(rail.getByRole("button")).toHaveText([
      "Mains",
      "Snacks",
      "Sides",
      "Drinks",
      "Desserts",
      "Change table",
    ]);
    await expect(rail.getByRole("button", { name: "Mains" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await add(page, "Matoke & Beef Stew").click();
    await rail.getByRole("button", { name: "Drinks" }).click();
    await expect(page.getByRole("heading", { name: "Drinks", level: 2 })).toBeVisible();
    await expect(add(page, "Passion Juice")).toBeVisible();
    await expect(add(page, "Matoke & Beef Stew")).toHaveCount(0);
    // The cart survives the category change.
    await expect(page.getByText("1 × UGX 18,000")).toBeVisible();
  });

  test("draws a placeholder plate with initials until a photo exists", async ({ page }) => {
    await openStation(page);
    await toMenu(page);
    const src = await add(page, "Fried Tilapia & Chips").locator("img").getAttribute("src");
    expect(src).toContain("data:image/svg+xml");
    expect(decodeURIComponent(src!)).toContain(">FT</text>");
  });

  test("hides unavailable items while the API does not send them", async ({ page }) => {
    await openStation(page, { tablesEndpoint: true, publicMenuSoldOut: false });
    await toMenu(page);
    await expect(page.getByRole("button", { name: /Grilled Goat Ribs/ })).toHaveCount(0);
  });

  test("steps and removes items; Review stays off until there is one", async ({ page }) => {
    await openStation(page);
    await toMenu(page);
    const review = page.getByRole("button", { name: "Review order" });
    await expect(review).toBeDisabled();
    await expect(page.getByText("Nothing yet. Tap a dish or drink to add it.")).toBeVisible();
    await page.getByRole("button", { name: "Snacks" }).click();
    await add(page, "Rolex").click();
    await page.getByRole("button", { name: "Add one Rolex" }).click();
    await expect(page.getByText("UGX 10,000", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Remove one Rolex" }).click();
    await page.getByRole("button", { name: "Remove one Rolex" }).click();
    await expect(review).toBeDisabled();
  });
});

test.describe("reviewing and sending", () => {
  test("reviews the cart without payment selection or customer payment fields", async ({
    page,
  }) => {
    await openStation(page);
    await toReview(page);
    await expect(page.getByRole("group", { name: "How will you pay?" })).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByLabel("Network")).toHaveCount(0);
    await expect(page.getByLabel("Phone number")).toHaveCount(0);
    await expect(send(page)).toHaveText("Send to kitchen · UGX 61,000");
  });

  test("returns to the menu when the last item is removed", async ({ page }) => {
    await openStation(page);
    await toMenu(page);
    await page.getByRole("button", { name: "Sides" }).click();
    await add(page, "Chapati").click();
    await page.getByRole("button", { name: "Review order" }).click();
    await page.getByRole("button", { name: "Remove one Chapati" }).click();
    await expect(page.getByRole("heading", { name: /^Sides$/, level: 2 })).toBeVisible();
  });

  test("sends the cart with the table's session and the kitchen note", async ({ page }) => {
    const api = await openStation(page);
    await toReview(page);
    await page.getByLabel("Special instructions for the kitchen").fill("no onions");
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();

    const call = api.callsTo("POST", "/api/my/orders/")[0];
    expect(call.sessionToken).toBe("token-5000");
    expect(call.body).toEqual({
      items: [
        { menu_item_id: 1, quantity: 2, special_instructions: "no onions" },
        { menu_item_id: 2, quantity: 1, special_instructions: "no onions" },
      ],
    });
    // The id is the database's, not a guess.
    await expect(page.getByText("ORD-1047 · Table 6")).toBeVisible();
    await expect(page.getByText("Kitchen note: no onions")).toBeVisible();
    await expect(page.getByText("2 × Matoke & Beef Stew")).toBeVisible();
  });

  test("restores an older draft without retaining payment fields or blocking submission", async ({
    page,
  }) => {
    const api = await openStation(page);
    await toReview(page);
    await page.getByLabel("Special instructions for the kitchen").fill("no onions");
    await page.evaluate(() => {
      const draft = JSON.parse(sessionStorage.getItem("rdbms.station")!);
      sessionStorage.setItem(
        "rdbms.station",
        JSON.stringify({
          ...draft,
          pay: "momo",
          network: "Airtel Money",
          phone: "0772",
        }),
      );
    });
    await page.reload();
    await expect(page.getByLabel("Special instructions for the kitchen")).toHaveValue("no onions");
    await expect(send(page)).toHaveText("Send to kitchen · UGX 61,000");
    await expect
      .poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("rdbms.station")!)))
      .not.toHaveProperty("phone");
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
    expect(api.callsTo("POST", "/api/my/orders/")).toHaveLength(1);
    expect(api.paid.size).toBe(0);
    await expect(page.getByText(/A payment request/)).toHaveCount(0);
    await expect(page.getByText(/ask your waiter for the payment options/)).toBeVisible();
  });

  for (const method of ["Cash", "Mobile Money"] as const) {
    test(`submits without payment then lets the cashier record ${method}`, async ({ page }) => {
      const api = await openStation(page);
      await toReview(page);
      await send(page).click();
      await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
      expect(api.paid.size).toBe(0);
      expect(api.calls.filter((c) => c.path.endsWith("/pay/"))).toHaveLength(0);
      const order = api.orders.find((o) => o.order_id === 1047)!;
      expect(order.order_status).toBe("pending");
      order.order_status = "served";
      api.set({ queueView: "cashier" });
      await signInAs(page, PERSONAS.cashier);
      await page.goto("/payments");
      await page.getByRole("button", { name: /^ORD-1047/ }).click();
      if (method === "Cash") {
        await page.getByLabel("Amount received (UGX)").fill("70000");
      } else {
        await page.getByRole("radio", { name: /^Mobile money/ }).check({ force: true });
        await page.getByLabel("Network").selectOption("Airtel Money");
        await page.getByLabel("Customer phone number").fill("0752123456");
      }
      await page.getByRole("button", { name: /^Record payment/ }).click();
      const receipt = page.locator("section", {
        has: page.getByText("Payment recorded", { exact: true }),
      });
      await expect(receipt).toContainText("PAY-0388 for ORD-1047");
      await expect(receipt).toContainText(method === "Cash" ? "Cash" : "Airtel Money");
      await expect(receipt).toContainText("UGX 61,000");
      await expect(receipt).toContainText(method === "Cash" ? "UGX 9,000" : "UGX 0");
      expect(api.callsTo("POST", "/api/staff/orders/1047/pay/").map((c) => c.body)).toEqual([
        { payment_method: method },
      ]);
      expect(api.paid.has(1047)).toBe(true);
    });
  }

  test("shows the server's reason when an item is no longer available", async ({ page }) => {
    await openStation(page, { ...FULL, placeError: "Not available right now: Chicken Luwombo" });
    await toReview(page);
    await send(page).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Error: Not available right now: Chicken Luwombo",
    );
    await expect(page.getByRole("heading", { name: "Check your order" })).toBeVisible();
    await expect(send(page)).toBeEnabled();
  });

  test("returns to the table step when the session has ended", async ({ page }) => {
    await openStation(page);
    await toReview(page);
    await page.evaluate(() => sessionStorage.removeItem("rdbms.customer"));
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Order from your table" })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Your session has ended");
  });
});

test.describe("after sending", () => {
  test("follows the kitchen: a refresh restores the order and its status", async ({ page }) => {
    const api = await openStation(page);
    await toReview(page);
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
    const tracker = page.getByRole("list", { name: "Order status" });
    await expect(tracker.getByRole("listitem").nth(0)).toHaveAttribute("aria-current", "step");

    api.orders.find((o) => o.order_id === 1047)!.order_status = "preparing";
    await page.reload();
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
    await expect(tracker.getByRole("listitem").nth(1)).toHaveAttribute("aria-current", "step");
    await expect(tracker.getByRole("listitem").nth(0)).toContainText("Done");
    await expect(page.getByText("ORD-1047 · Table 6")).toBeVisible();
  });

  test("polls the kitchen every few seconds", async ({ page }) => {
    const api = await openStation(page, FULL, true);
    await toReview(page);
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
    const tracker = page.getByRole("list", { name: "Order status" });

    api.orders.find((o) => o.order_id === 1047)!.order_status = "served";
    await page.clock.runFor(6_000);
    await expect(tracker.getByRole("listitem").nth(2)).toHaveAttribute("aria-current", "step");
    await expect(tracker.getByRole("listitem").nth(2)).toContainText("Now");
    await expect(page.getByRole("button", { name: /Prototype only/ })).toBeDisabled();
  });

  test("says so when the kitchen cancels the order", async ({ page }) => {
    const api = await openStation(page);
    await toReview(page);
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Order sent to the kitchen" })).toBeVisible();
    api.orders.find((o) => o.order_id === 1047)!.order_status = "cancelled";
    await page.reload();
    await expect(
      page.getByText("This order was cancelled. Please speak to a waiter."),
    ).toBeVisible();
  });

  test("starts a new order from scratch", async ({ page }) => {
    await openStation(page);
    await toReview(page);
    await send(page).click();
    await page.getByRole("button", { name: "Start a new order" }).click();
    await expect(page.getByRole("heading", { name: "Order from your table" })).toBeVisible();
    await expect(start(page)).toBeDisabled();
    expect(await page.evaluate(() => sessionStorage.getItem("rdbms.customer"))).toBeNull();
    // What the station remembers is back to an empty draft.
    const draft = JSON.parse(
      (await page.evaluate(() => sessionStorage.getItem("rdbms.station"))) ?? "{}",
    );
    expect(draft).toMatchObject({ screen: "start", table: null, lines: [], orderId: null });
  });
});

test.describe("the header", () => {
  test("announces progress to screen readers", async ({ page }) => {
    await openStation(page);
    const steps = page.getByRole("list", { name: "Order progress" }).getByRole("listitem");
    await expect(steps.nth(0)).toHaveAttribute("aria-label", "Step 1 of 4, Table, current");
    await expect(steps.nth(1)).toHaveAttribute("aria-label", "Step 2 of 4, Menu, upcoming");
    await toMenu(page);
    await expect(steps.nth(0)).toHaveAttribute("aria-label", "Step 1 of 4, Table, completed");
    await expect(steps.nth(1)).toHaveAttribute("aria-label", "Step 2 of 4, Menu, current");
    await expect(steps.nth(1)).toHaveAttribute("aria-current", "step");
  });
});

test.describe("the canvas", () => {
  test("reflows on a smaller screen without shrinking controls", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 400 });
    await openStation(page);
    expect((await page.locator("header").boundingBox())!.width).toBe(640);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "36px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      640,
    );
    expect((await table(page, 6).boundingBox())!.height).toBeGreaterThanOrEqual(96);
    await table(page, 6).click();
    await expect(start(page)).toBeEnabled();
  });

  test("forgets the last customer after five idle minutes", async ({ page }) => {
    await openStation(page, FULL, true);
    await table(page, 6).click();
    await expect(table(page, 6)).toHaveAttribute("aria-pressed", "true");

    await page.clock.runFor(5 * 60_000 + 1_000);
    await expect(table(page, 6)).toHaveAttribute("aria-pressed", "false");
    await expect(start(page)).toBeDisabled();
  });

  test("keeps the cart across a refresh", async ({ page }) => {
    await openStation(page);
    await toMenu(page);
    await add(page, "Matoke & Beef Stew").click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Mains", level: 2 })).toBeVisible();
    await expect(page.getByText("1 × UGX 18,000")).toBeVisible();
  });
});
