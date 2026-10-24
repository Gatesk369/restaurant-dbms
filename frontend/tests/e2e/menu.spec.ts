import { expect, test, type Page } from "@playwright/test";

import { FakeApi, type FakeOptions } from "./fake-api";
import { PERSONAS, fontsReady, signInAs, type Persona } from "./helpers";

test.use({ viewport: { width: 1360, height: 900 } });

/** The API with the category and archived columns (backend issue #13 done). */
const FULL: FakeOptions = { menuFeatures: { category: true, archived: true } };

async function openMenu(
  page: Page,
  options: FakeOptions = FULL,
  persona: Persona = PERSONAS.manager,
) {
  const api = new FakeApi({ tablesEndpoint: true, ...options });
  await api.install(page);
  await signInAs(page, persona);
  await page.goto("/menu");
  if (persona.role === "manager") {
    await expect(page.getByRole("heading", { level: 1, name: "Menu management" })).toBeVisible();
  } else {
    await expect(page).toHaveURL(persona.role === "cashier" ? "/payments" : "/orders");
  }
  await fontsReady(page);
  return api;
}

const rows = (page: Page) => page.getByRole("table", { name: "Menu items" }).getByRole("row");
const row = (page: Page, name: string | RegExp) =>
  page.getByRole("table", { name: "Menu items" }).getByRole("row", { name });

test.describe("menu editor dialog", () => {
  test("opens as a centered popup that fits the viewport", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("button", { name: "Add item" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu item editor" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add item", level: 2 })).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThan(0);
    expect(bounds!.y).toBeGreaterThan(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1360);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    expect(Math.abs(bounds!.x + bounds!.width / 2 - 680)).toBeLessThanOrEqual(2);
  });
});

test.describe("the list", () => {
  test("shows items in menu order with their status", async ({ page }) => {
    await openMenu(page);
    await expect(row(page, /MI-001/)).toContainText("Matoke & Beef Stew");
    await expect(row(page, /MI-001/)).toContainText("18,000");
    await expect(row(page, /MI-001/).getByText("Available", { exact: true })).toBeVisible();
    await expect(row(page, /MI-005/).getByText("Unavailable", { exact: true })).toBeVisible();
    // Archived items are hidden until asked for.
    await expect(row(page, /MI-017/)).toHaveCount(0);
    await expect(page.getByText("Show archived (1)")).toBeVisible();
    await expect(
      page.getByText(
        "Showing 17 of 18 items. Archived items stay on past orders and reports but cannot be ordered.",
      ),
    ).toBeVisible();
  });

  test("combines search, category and archived filters", async ({ page }) => {
    await openMenu(page);
    const categories = page.getByRole("group", { name: "Menu category" });
    await expect(categories.getByRole("button")).toHaveText([
      "All",
      "Mains",
      "Snacks",
      "Sides",
      "Drinks",
      "Desserts",
    ]);
    await categories.getByRole("button", { name: "Drinks" }).click();
    await expect(rows(page)).toHaveCount(6); // header + 5 drinks
    await page.getByLabel("Search menu items").fill("juice");
    await expect(rows(page)).toHaveCount(3);

    await categories.getByRole("button", { name: "Desserts" }).click();
    await page.getByLabel("Search menu items").fill("");
    await expect(rows(page)).toHaveCount(2); // Banana Fritters is archived
    await page.getByRole("checkbox", { name: /Show archived/ }).check();
    await expect(rows(page)).toHaveCount(3);
    await expect(row(page, /MI-017/).getByText("Archived", { exact: true })).toBeVisible();
    await expect(
      row(page, /MI-017/).getByRole("button", { name: "Restore Banana Fritters" }),
    ).toBeVisible();
  });

  test("shows archive feedback, archived rows and the no-match state", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("button", { name: "Archive Fruit Platter" }).click();
    await expect(
      page.getByText("Fruit Platter archived. Past orders still show it."),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /Show archived/ }).check();
    await expect(row(page, /MI-018/)).toContainText("Archived");
    await page.getByLabel("Search menu items").fill("zzz");
    await expect(page.getByText("No items match.")).toBeVisible();
  });
});

test.describe("adding and editing", () => {
  test("validates the name and price inline, then creates the item", async ({ page }) => {
    const api = await openMenu(page);
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByRole("button", { name: "Save item" }).click();

    await expect(page.getByText("Error: enter a name for the item.")).toBeVisible();
    await expect(
      page.getByText("Error: price must be a whole number greater than 0."),
    ).toBeVisible();
    await expect(page.getByLabel("Item name")).toHaveAttribute("aria-invalid", "true");
    expect(api.callsTo("POST", "/api/staff/menu/")).toHaveLength(0);

    // Typing a price strips letters; a zero price is still refused.
    await page.getByLabel("Price (UGX)").fill("12ab0");
    await expect(page.getByLabel("Price (UGX)")).toHaveValue("120");
    await page.getByLabel("Price (UGX)").fill("0");
    await page.getByLabel("Item name").fill("Roasted Maize");
    await page.getByRole("button", { name: "Save item" }).click();
    await expect(
      page.getByText("Error: price must be a whole number greater than 0."),
    ).toBeVisible();

    await page.getByLabel("Price (UGX)").fill("4500");
    await page.getByLabel("Category", { exact: true }).selectOption("Snacks");
    await page.getByRole("button", { name: "Save item" }).click();

    await expect(page.getByText("Roasted Maize added as MI-019.")).toBeVisible();
    expect(api.callsTo("POST", "/api/staff/menu/")[0].body).toEqual({
      item_name: "Roasted Maize",
      price: 4500,
      availability_status: true,
      category: "Snacks",
      image_url: null,
    });
    await expect(row(page, /MI-019/)).toContainText("Roasted Maize");
    await expect(row(page, /MI-019/)).toContainText("Snacks");
    await expect(page.getByRole("dialog", { name: "Menu item editor" })).toBeHidden();
  });

  test("loads an item, saves changes and keeps the list in step", async ({ page }) => {
    const api = await openMenu(page);
    await page.getByRole("button", { name: "Edit Rolex" }).click();
    await expect(page.getByRole("heading", { name: "Edit MI-006" })).toBeVisible();
    await expect(page.getByLabel("Item name")).toHaveValue("Rolex");
    await expect(page.getByLabel("Price (UGX)")).toHaveValue("5000");
    await expect(page.getByLabel("Category", { exact: true })).toHaveValue("Snacks");
    await expect(page.getByLabel("Available for ordering today")).toBeChecked();
    await expect(row(page, /MI-006/)).toHaveCSS("background-color", "rgb(228, 219, 196)");

    await page.getByLabel("Price (UGX)").fill("5500");
    await page.getByLabel("Available for ordering today").uncheck();
    await page.getByRole("button", { name: "Save item" }).click();

    await expect(page.getByText("Rolex updated.")).toBeVisible();
    expect(api.callsTo("PATCH", "/api/staff/menu/6/")[0].body).toMatchObject({
      item_name: "Rolex",
      price: 5500,
      availability_status: false,
    });
    await expect(row(page, /MI-006/)).toContainText("5,500");
    await expect(row(page, /MI-006/).getByText("Unavailable", { exact: true })).toBeVisible();
  });

  test("cancel closes the form without saving", async ({ page }) => {
    const api = await openMenu(page);
    await page.getByRole("button", { name: "Edit Rolex" }).click();
    await page.getByLabel("Item name").fill("Changed");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog", { name: "Menu item editor" })).toBeHidden();
    expect(api.callsTo("PATCH", "/api/staff/menu/6/")).toHaveLength(0);
  });

  test("shows the server's reason when it refuses a save", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Item name").fill("x".repeat(101));
    await page.getByLabel("Price (UGX)").fill("1000");
    await page.getByRole("button", { name: "Save item" }).click();
    await expect(page.getByRole("alert")).toHaveText("Error: Enter a name of 1 to 100 characters.");
    // The form stays open so nothing typed is lost.
    await expect(page.getByLabel("Price (UGX)")).toHaveValue("1000");
  });
});

test.describe("archiving and restoring", () => {
  test("archives an item with the archived column, then restores it", async ({ page }) => {
    const api = await openMenu(page);
    await page.getByRole("button", { name: "Archive Chapati" }).click();
    await expect(page.getByText("Chapati archived. Past orders still show it.")).toBeVisible();
    expect(api.callsTo("DELETE", "/api/staff/menu/9/")).toHaveLength(1);
    await expect(row(page, /MI-009/)).toHaveCount(0);
    await expect(page.getByText("Show archived (2)")).toBeVisible();

    await page.getByRole("checkbox", { name: /Show archived/ }).check();
    await page.getByRole("button", { name: "Restore Chapati" }).click();
    await expect(page.getByText("Chapati restored to the menu.")).toBeVisible();
    expect(api.callsTo("PATCH", "/api/staff/menu/9/")[0].body).toEqual({
      archived: false,
      availability_status: true,
    });
    await expect(row(page, /MI-009/).getByText("Available", { exact: true })).toBeVisible();
  });

  test("returns to the list before archiving a row", async ({ page }) => {
    await openMenu(page);
    await page.getByRole("button", { name: "Edit Chapati" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog", { name: "Menu item editor" })).toBeHidden();
    await page.getByRole("button", { name: "Archive Chapati" }).click();
    await expect(page.getByText("Chapati archived. Past orders still show it.")).toBeVisible();
  });
});

test.describe("while the API has no category or archived column", () => {
  test("shows hidden items as Archived and restores through availability", async ({ page }) => {
    const api = await openMenu(page, {});
    // Unavailable and archived cannot be told apart yet: both are hidden.
    await expect(page.getByText("Show archived (2)")).toBeVisible();
    await expect(row(page, /MI-005/)).toHaveCount(0);

    await page.getByRole("checkbox", { name: /Show archived/ }).check();
    await expect(row(page, /MI-005/).getByText("Archived", { exact: true })).toBeVisible();
    // Categories still show, from the interim name lookup.
    await expect(row(page, /MI-005/)).toContainText("Mains");

    await page.getByRole("button", { name: "Restore Grilled Goat Ribs" }).click();
    await expect(page.getByText("Grilled Goat Ribs restored to the menu.")).toBeVisible();
    expect(api.callsTo("PATCH", "/api/staff/menu/5/")[0].body).toEqual({
      availability_status: true,
    });
  });

  test("says that the category choice is not stored", async ({ page }) => {
    await openMenu(page, {});
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(
      page.getByText("Categories are not stored yet, so this choice is not saved."),
    ).toBeVisible();

    // The note disappears once the API stores categories.
    await page.unrouteAll();
    await openMenu(page, FULL);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Categories are not stored yet")).toHaveCount(0);
  });
});

test.describe("access", () => {
  test("redirects a cashier before loading protected data", async ({ page }) => {
    const api = await openMenu(page, FULL, PERSONAS.cashier);
    await expect(page).toHaveURL("/payments");
    await expect(page.getByText(/Locked for/)).toHaveCount(0);
    expect(api.callsTo("GET", "/api/staff/menu/")).toHaveLength(0);
  });
});
