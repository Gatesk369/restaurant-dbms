import { expect, test, type Page } from "@playwright/test";

import { expectElementMatchesReference } from "../visual/compare";
import { FakeApi, type FakeOptions } from "./fake-api";
import { PERSONAS, fontsReady, signInAs, type Persona } from "./helpers";

test.use({ viewport: { width: 1360, height: 900 } });

/** Sunday 11 October 2026, midday in Kampala: the artboard's "this week". */
const SUNDAY = "2026-10-11T09:00:00Z";

/** The API with every optional report column (gaps G2, G11, G13 closed). */
const FULL: FakeOptions = { reportFeatures: { seats: true, avgStay: true, networks: true } };

async function openReports(
  page: Page,
  options: FakeOptions = FULL,
  persona: Persona = PERSONAS.manager,
  path = "/reports",
) {
  const api = new FakeApi({ tablesEndpoint: true, ...options });
  await api.install(page);
  await page.clock.setFixedTime(new Date(SUNDAY));
  await signInAs(page, persona);
  await page.goto(path);
  if (persona.role === "manager") {
    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  } else {
    await expect(page).toHaveURL(persona.role === "cashier" ? "/payments" : "/orders");
  }
  await fontsReady(page);
  return api;
}

const panel = (page: Page, heading: string) =>
  page.locator("section", { has: page.getByRole("heading", { name: heading, exact: true }) });
const summary = (page: Page) => page.getByRole("region", { name: "Summary" });
const chart = (page: Page) => page.getByRole("img", { name: /^Bar chart of revenue/ });

test.describe("fidelity against the mock-up", () => {
  test("This week matches the artboard panel by panel", async ({ page }) => {
    await openReports(page);
    await expect(page.getByText("5 to 11 October 2026")).toBeVisible();
    const ref = "staff-reports";

    await expectElementMatchesReference(page, summary(page), ref, {
      x: 264,
      y: 112,
      width: 1072,
      height: 84,
    });
    // Value labels over the bars are drawn with grayscale text smoothing here
    // and sub-pixel smoothing in the capture; the geometry is identical.
    await expectElementMatchesReference(
      page,
      panel(page, "Daily revenue"),
      ref,
      { x: 264, y: 220, width: 661, height: 355 },
      { maxRatio: 0.01 },
    );
    await expectElementMatchesReference(page, panel(page, "Payment methods"), ref, {
      x: 949,
      y: 220,
      width: 387,
      height: 422,
    });
    await expectElementMatchesReference(page, panel(page, "Top-selling menu items"), ref, {
      x: 264,
      y: 666,
      width: 606,
      height: 410,
    });
    await expectElementMatchesReference(page, panel(page, "Waiter performance"), ref, {
      x: 894,
      y: 666,
      width: 442,
      height: 293,
    });
    await expectElementMatchesReference(page, panel(page, "Daily sales"), ref, {
      x: 264,
      y: 1100,
      width: 606,
      height: 506,
    });
    await expectElementMatchesReference(page, panel(page, "Table turnover"), ref, {
      x: 894,
      y: 1100,
      width: 442,
      height: 650,
    });
  });

  test("Last 4 weeks matches the artboard", async ({ page }) => {
    await openReports(page);
    await page.getByRole("button", { name: "Last 4 weeks" }).click();
    await expect(page.getByText("14 September to 11 October 2026")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Weekly revenue" })).toBeVisible();
    const ref = "staff-reports-month";

    await expectElementMatchesReference(page, summary(page), ref, {
      x: 264,
      y: 112,
      width: 1072,
      height: 84,
    });
    // Value labels over the bars are drawn with grayscale text smoothing here
    // and sub-pixel smoothing in the capture; the geometry is identical.
    await expectElementMatchesReference(
      page,
      panel(page, "Weekly revenue"),
      ref,
      { x: 264, y: 220, width: 661, height: 355 },
      { maxRatio: 0.01 },
    );
    await expectElementMatchesReference(page, panel(page, "Weekly sales"), ref, {
      x: 264,
      y: 1100,
      width: 606,
      height: 362,
    });
    await expectElementMatchesReference(page, panel(page, "Table turnover"), ref, {
      x: 894,
      y: 1100,
      width: 442,
      height: 650,
    });
  });
});

test.describe("the date range", () => {
  test("asks for Monday to Sunday of this week", async ({ page }) => {
    const api = await openReports(page);
    const call = api.callsTo("GET", "/api/staff/reports/daily-sales/")[0];
    expect(call.query).toContain("from=2026-10-05");
    expect(call.query).toContain("to=2026-10-11");
    expect(api.callsTo("GET", "/api/staff/reports/top-items/")[0].query).toContain("limit=6");
    // All five reports are requested for the same range.
    for (const kind of ["top-items", "waiter-performance", "payment-methods", "table-turnover"]) {
      expect(api.callsTo("GET", `/api/staff/reports/${kind}/`)).toHaveLength(1);
    }
  });

  test("switches to the four weeks ending that Sunday and keeps it in the URL", async ({
    page,
  }) => {
    const api = await openReports(page);
    const toggle = page.getByRole("group", { name: "Date range" });
    await expect(toggle.getByRole("button", { name: "This week" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await toggle.getByRole("button", { name: "Last 4 weeks" }).click();
    await expect(page).toHaveURL(/\?range=month$/);
    await expect(toggle.getByRole("button", { name: "Last 4 weeks" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const monthCall = api.callsTo("GET", "/api/staff/reports/daily-sales/").at(-1)!;
    expect(monthCall.query).toContain("from=2026-09-14");
    expect(monthCall.query).toContain("to=2026-10-11");

    await page.reload();
    await expect(page.getByText("14 September to 11 October 2026")).toBeVisible();
  });

  test("treats an unknown range as this week", async ({ page }) => {
    await openReports(page, FULL, PERSONAS.manager, "/reports?range=forever");
    await expect(page.getByText("5 to 11 October 2026")).toBeVisible();
  });

  test("uses the week the clock says it is", async ({ page }) => {
    const api = new FakeApi({ tablesEndpoint: true });
    await api.install(page);
    // Wednesday 14 October: the week is 12 to 18 October.
    await page.clock.setFixedTime(new Date("2026-10-14T09:00:00Z"));
    await signInAs(page, PERSONAS.manager);
    await page.goto("/reports");
    await expect(page.getByText("12 to 18 October 2026")).toBeVisible();
    expect(api.callsTo("GET", "/api/staff/reports/daily-sales/")[0].query).toContain(
      "from=2026-10-12",
    );
  });
});

test.describe("the figures", () => {
  test("summarise the week", async ({ page }) => {
    await openReports(page);
    const strip = summary(page);
    await expect(strip).toContainText("Revenue");
    await expect(strip).toContainText("UGX 10,820,000");
    await expect(strip).toContainText("345");
    await expect(strip).toContainText("UGX 31,362");
    await expect(strip).toContainText("Busiest day");
    await expect(strip).toContainText("Sat 10 Oct");
  });

  test("summarise four weeks from the same daily rows", async ({ page }) => {
    await openReports(page);
    await page.getByRole("button", { name: "Last 4 weeks" }).click();
    const strip = summary(page);
    await expect(strip).toContainText("UGX 40,540,000");
    await expect(strip).toContainText("1,321");
    await expect(strip).toContainText("UGX 30,689");
    await expect(strip).toContainText("Busiest week");
    await expect(strip).toContainText("5–11 Oct");
  });

  test("the weekly table sums the daily rows and totals them", async ({ page }) => {
    await openReports(page);
    await page.getByRole("button", { name: "Last 4 weeks" }).click();
    const table = page.getByRole("table", { name: "Sales by period" });
    await expect(table.getByRole("row")).toHaveCount(6); // header + 4 weeks + total
    await expect(table.getByRole("row").nth(1)).toContainText("14–20 Sep");
    await expect(table.getByRole("row").nth(1)).toContainText("318");
    await expect(table.getByRole("row").nth(1)).toContainText("9,640,000");
    await expect(table.getByRole("row").nth(3)).toContainText("28 Sep–4 Oct");
    const total = table.getByRole("row").last();
    await expect(total).toContainText("Total");
    await expect(total).toContainText("1,321");
    await expect(total).toContainText("40,540,000");
  });

  test("the chart labels every bar and darkens the tallest", async ({ page }) => {
    await openReports(page);
    const bars = chart(page);
    await expect(bars).toContainText("2.41M");
    await expect(bars).toContainText("0.98M");
    for (const tick of ["0", "0.5M", "1M", "1.5M", "2M", "2.5M"]) {
      await expect(bars.getByText(tick, { exact: true }).first()).toBeVisible();
    }
    const saturday = bars.locator('[title^="Sat 10 Oct"]');
    await expect(saturday).toHaveAttribute("title", "Sat 10 Oct: UGX 2,410,000, 74 orders");
    await expect(saturday).toHaveCSS("background-color", "rgb(24, 68, 42)");
    await expect(bars.locator('[title^="Mon 5 Oct"]')).toHaveCSS(
      "background-color",
      "rgb(69, 100, 74)",
    );
  });

  test("the weekly chart uses a round axis for its larger values", async ({ page }) => {
    await openReports(page);
    await page.getByRole("button", { name: "Last 4 weeks" }).click();
    const bars = chart(page);
    for (const tick of ["0", "3M", "6M", "9M", "12M"]) {
      await expect(bars.getByText(tick, { exact: true }).first()).toBeVisible();
    }
    await expect(bars).toContainText("10.82M");
  });

  test("lists top items and waiters", async ({ page }) => {
    await openReports(page);
    const items = page.getByRole("table", { name: "Top-selling menu items" });
    await expect(items.getByRole("row")).toHaveCount(7);
    await expect(items.getByRole("row").nth(1)).toContainText("Rolex");
    await expect(items.getByRole("row").nth(1)).toContainText("212");
    await expect(items.getByRole("row").nth(1)).toContainText("1,060,000");

    const waiters = page.getByRole("table", { name: "Waiter performance" });
    await expect(waiters.getByRole("row").nth(1)).toContainText("Okello Peter");
    await expect(waiters.getByRole("row").nth(1)).toContainText("130");
    await expect(waiters.getByRole("row").nth(1)).toContainText("33,154");
  });
});

test.describe("payment methods", () => {
  test("show the API's two methods today and sum to 100%", async ({ page }) => {
    await openReports(page, { reportFeatures: {} });
    const donut = page.getByRole("img", { name: /^Donut chart of payment methods/ });
    await expect(donut).toHaveAttribute(
      "aria-label",
      "Donut chart of payment methods: Cash 41 percent, Mobile Money 59 percent",
    );
    await expect(page.getByText("Cash · 41%")).toBeVisible();
    await expect(page.getByText("Mobile Money · 59%")).toBeVisible();
    await expect(page.getByText("UGX 4,436,200")).toBeVisible();
    await expect(donut).toContainText("UGX 10.82M");
  });

  test("split by network once payments store one", async ({ page }) => {
    await openReports(page);
    await expect(page.getByText("Cash · 41%")).toBeVisible();
    await expect(page.getByText("MTN Mobile Money · 38%")).toBeVisible();
    await expect(page.getByText("Airtel Money · 21%")).toBeVisible();
  });
});

test.describe("table turnover columns", () => {
  test("hide Seats and Average stay until the API sends them", async ({ page }) => {
    await openReports(page, { reportFeatures: {} });
    const table = page.getByRole("table", { name: "Table turnover" });
    await expect(table.getByRole("columnheader")).toHaveText(["Table", "Turns per day"]);
    await expect(table.getByRole("row")).toHaveCount(13);
  });

  test("show them when it does", async ({ page }) => {
    await openReports(page);
    const table = page.getByRole("table", { name: "Table turnover" });
    await expect(table.getByRole("columnheader")).toHaveText([
      "Table",
      "Seats",
      "Turns per day",
      "Average stay",
    ]);
    await expect(table.getByRole("row").nth(1)).toContainText("T1");
    await expect(table.getByRole("row").nth(1)).toContainText("42 min");
  });
});

test.describe("access", () => {
  test("redirects a cashier before loading protected data", async ({ page }) => {
    const api = await openReports(page, FULL, PERSONAS.cashier);
    await expect(page).toHaveURL("/payments");
    await expect(page.getByText(/Locked for/)).toHaveCount(0);
    expect(api.callsTo("GET", "/api/staff/reports/daily-sales/")).toHaveLength(0);
  });

  test("returns to sign-in when the session has ended", async ({ page }) => {
    await new FakeApi({ expired: true }).install(page);
    await page.clock.setFixedTime(new Date(SUNDAY));
    await signInAs(page, PERSONAS.manager);
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/\?reason=expired$/);
  });
});
