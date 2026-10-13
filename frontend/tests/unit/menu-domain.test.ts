import { describe, expect, it } from "vitest";

import type { MenuFeatures } from "~/lib/api/menu";
import type { MenuItem } from "~/lib/api/types";
import { archivedCount, filterMenu, itemStatus, menuItemNumber } from "~/lib/domain/menu";
import { isValidItemName, isValidPrice } from "~/lib/validation";

const today: MenuFeatures = { category: false, archived: false };
const full: MenuFeatures = { category: true, archived: true };

function item(id: number, name: string, extra: Partial<MenuItem> = {}): MenuItem {
  return {
    menu_item_id: id,
    item_name: name,
    description: null,
    price: 5000,
    availability_status: true,
    ...extra,
  };
}

describe("menuItemNumber", () => {
  it("pads to three digits", () => {
    expect(menuItemNumber(5)).toBe("MI-005");
    expect(menuItemNumber(18)).toBe("MI-018");
    expect(menuItemNumber(1021)).toBe("MI-1021");
  });
});

describe("itemStatus", () => {
  it("separates unavailable from archived when the API has the column", () => {
    expect(itemStatus(item(1, "A", { archived: false }), full)).toBe("available");
    expect(itemStatus(item(2, "B", { archived: false, availability_status: false }), full)).toBe(
      "unavailable",
    );
    expect(itemStatus(item(3, "C", { archived: true, availability_status: false }), full)).toBe(
      "archived",
    );
    expect(itemStatus(item(4, "D", { archived: true }), full)).toBe("archived");
  });

  it("treats a hidden item as archived while there is one flag", () => {
    expect(itemStatus(item(1, "A"), today)).toBe("available");
    expect(itemStatus(item(2, "B", { availability_status: false }), today)).toBe("archived");
  });
});

describe("filterMenu", () => {
  const items = [
    item(1, "Matoke & Beef Stew"),
    item(2, "Rolex"),
    item(3, "Passion Juice"),
    item(4, "Mango Juice", { availability_status: false }),
  ];

  it("hides archived items unless asked", () => {
    const base = { search: "", category: "All", showArchived: false };
    expect(filterMenu(items, today, base).map((i) => i.menu_item_id)).toEqual([1, 2, 3]);
    expect(filterMenu(items, today, { ...base, showArchived: true })).toHaveLength(4);
  });

  it("combines search and category", () => {
    const all = { search: "", category: "All", showArchived: true };
    expect(
      filterMenu(items, today, { ...all, search: "JUICE" }).map((i) => i.menu_item_id),
    ).toEqual([3, 4]);
    expect(
      filterMenu(items, today, { ...all, category: "Drinks" }).map((i) => i.menu_item_id),
    ).toEqual([3, 4]);
    expect(filterMenu(items, today, { ...all, category: "Drinks", search: "mango" })).toHaveLength(
      1,
    );
    expect(
      filterMenu(items, today, { ...all, category: "Snacks" }).map((i) => i.item_name),
    ).toEqual(["Rolex"]);
  });

  it("counts archived items", () => {
    expect(archivedCount(items, today)).toBe(1);
    expect(archivedCount(items, full)).toBe(0);
  });
});

describe("form validation", () => {
  it("needs a name", () => {
    expect(isValidItemName("Rolex")).toBe(true);
    expect(isValidItemName("   ")).toBe(false);
    expect(isValidItemName("")).toBe(false);
  });

  it("needs a whole number above zero", () => {
    expect(isValidPrice("18000")).toBe(true);
    expect(isValidPrice(" 5000 ")).toBe(true);
    expect(isValidPrice("0")).toBe(false);
    expect(isValidPrice("")).toBe(false);
    expect(isValidPrice("-5")).toBe(false);
    expect(isValidPrice("12.5")).toBe(false);
    expect(isValidPrice("12a")).toBe(false);
  });
});
