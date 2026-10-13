import { describe, expect, it } from "vitest";

import type { Order, OrderStatus } from "~/lib/api/types";
import { orderPlacedEntries, pushEntries, statusChangedEntry } from "~/lib/domain/activity-log";
import { addToCart, cartTotal, changeQuantity, quantityOf } from "~/lib/domain/cart";
import { categoriesPresent, categoryOf } from "~/lib/domain/menu-categories";
import { filterOf, isActive, nextAction, statusLabel, statusTone } from "~/lib/domain/order-status";
import {
  deriveTables,
  parseTableIds,
  tableAriaLabel,
  tableLabel,
  tableSub,
} from "~/lib/domain/tables";
import { clockTime, isSameKampalaDay } from "~/lib/time";

function order(status: OrderStatus, extra: Partial<Order> = {}): Order {
  return {
    order_id: 1044,
    table_id: 4,
    order_status: status,
    order_time: "2026-10-11T09:00:00Z",
    staff_id: 1004,
    waiter: "okello.peter",
    items: [],
    total: 0,
    ...extra,
  };
}

describe("status words", () => {
  it("keeps the mock-up's words and adds Ready", () => {
    expect(statusLabel("pending")).toBe("Pending");
    expect(statusLabel("confirmed")).toBe("Pending");
    expect(statusLabel("preparing")).toBe("Preparing");
    expect(statusLabel("ready")).toBe("Ready");
    expect(statusLabel("served")).toBe("Served");
  });

  it("uses the mock-up colours", () => {
    expect(statusTone("confirmed")).toBe("neutral");
    expect(statusTone("preparing")).toBe("active");
    expect(statusTone("served")).toBe("done");
  });

  it("groups statuses under the four filter chips", () => {
    expect(filterOf("pending")).toBe("Pending");
    expect(filterOf("confirmed")).toBe("Pending");
    expect(filterOf("preparing")).toBe("Preparing");
    expect(filterOf("ready")).toBe("Preparing");
    expect(filterOf("served")).toBe("Served");
    expect(filterOf("cancelled")).toBeNull();
  });
});

describe("nextAction", () => {
  it("lets the kitchen and the manager start and finish cooking", () => {
    for (const role of ["kitchen", "manager"] as const) {
      expect(nextAction(role, order("confirmed"), 1)).toEqual({
        kind: "advance",
        label: "Start preparing",
        to: "preparing",
      });
      expect(nextAction(role, order("preparing"), 1)).toEqual({
        kind: "advance",
        label: "Mark ready",
        to: "ready",
      });
    }
  });

  it("lets wait staff serve only their own ready orders", () => {
    expect(nextAction("wait_staff", order("ready"), 1004)).toEqual({
      kind: "advance",
      label: "Mark served",
      to: "served",
    });
    expect(nextAction("wait_staff", order("ready"), 1099)).toEqual({
      kind: "note",
      text: "Ready to serve",
    });
    expect(nextAction("wait_staff", order("confirmed"), 1004)).toEqual({
      kind: "note",
      text: "Waiting for the kitchen",
    });
    expect(nextAction("wait_staff", order("preparing"), 1004)).toEqual({
      kind: "note",
      text: "Being prepared",
    });
  });

  it("lets a manager serve any ready order", () => {
    expect(nextAction("manager", order("ready"), 1)).toMatchObject({ to: "served" });
  });

  it("sends served orders to payment for cashiers and managers", () => {
    expect(nextAction("cashier", order("served"), 1)).toEqual({ kind: "pay" });
    expect(nextAction("manager", order("served"), 1)).toEqual({ kind: "pay" });
    expect(nextAction("wait_staff", order("served"), 1004)).toEqual({
      kind: "note",
      text: "Awaiting payment",
    });
    expect(nextAction("cashier", order("served", { paid: true }), 1)).toEqual({
      kind: "note",
      text: "Paid",
    });
  });

  it("never offers kitchen buttons to cashiers", () => {
    expect(nextAction("cashier", order("confirmed"), 1).kind).toBe("note");
    expect(nextAction("cashier", order("preparing"), 1).kind).toBe("note");
  });

  it("waits for an assigned waiter before anything else happens", () => {
    expect(nextAction("manager", order("pending"), 1)).toEqual({
      kind: "note",
      text: "Waiting for a waiter",
    });
  });
});

describe("isActive", () => {
  const now = new Date("2026-10-11T12:00:00Z");

  it("drops cancelled orders and keeps open ones", () => {
    expect(isActive(order("cancelled"), now, isSameKampalaDay)).toBe(false);
    expect(isActive(order("preparing"), now, isSameKampalaDay)).toBe(true);
  });

  it("uses the paid flag when the API provides it", () => {
    expect(isActive(order("served", { paid: true }), now, isSameKampalaDay)).toBe(false);
    expect(
      isActive(
        order("served", { paid: false, order_time: "2026-10-01T09:00:00Z" }),
        now,
        isSameKampalaDay,
      ),
    ).toBe(true);
  });

  it("treats older served orders as finished when paid is unknown", () => {
    expect(isActive(order("served"), now, isSameKampalaDay)).toBe(true);
    expect(
      isActive(order("served", { order_time: "2026-10-09T09:00:00Z" }), now, isSameKampalaDay),
    ).toBe(false);
  });
});

describe("tables", () => {
  it("parses ranges and lists", () => {
    expect(parseTableIds("1-12")).toHaveLength(12);
    expect(parseTableIds("1001, 1003,1002")).toEqual([1001, 1002, 1003]);
    expect(parseTableIds("1-3,2-4,x")).toEqual([1, 2, 3, 4]);
    expect(parseTableIds("")).toEqual([]);
  });

  it("derives occupancy from orders that hold a table", () => {
    const orders = [
      order("preparing", { table_id: 2 }),
      order("served", { table_id: 3 }),
      order("served", { table_id: 4, paid: true }),
      order("cancelled", { table_id: 5 }),
    ];
    const tables = deriveTables([1, 2, 3, 4, 5], orders);
    expect(tables.map((t) => [t.table_id, t.free_status])).toEqual([
      [1, true],
      [2, false],
      [3, false],
      [4, true],
      [5, true],
    ]);
  });

  it("labels tiles with seats when known and the state otherwise", () => {
    expect(tableLabel({ table_id: 7 })).toBe("T7");
    expect(tableSub({ table_id: 7, free_status: true, seats: 4 })).toBe("4 seats");
    expect(tableSub({ table_id: 7, free_status: true })).toBe("Free");
    expect(tableSub({ table_id: 7, free_status: false, seats: 4 })).toBe("Occupied");
    expect(tableAriaLabel({ table_id: 7, free_status: true, seats: 4 })).toBe("Table 7, 4 seats");
    expect(tableAriaLabel({ table_id: 7, free_status: true })).toBe("Table 7, free");
    expect(tableAriaLabel({ table_id: 7, free_status: false })).toBe("Table 7, occupied");
  });
});

describe("cart", () => {
  it("adds, steps and removes lines", () => {
    let lines = addToCart([], 6);
    lines = addToCart(lines, 6);
    lines = addToCart(lines, 9);
    expect(lines).toEqual([
      { menu_item_id: 6, quantity: 2 },
      { menu_item_id: 9, quantity: 1 },
    ]);
    expect(quantityOf(lines, 6)).toBe(2);
    expect(quantityOf(lines, 99)).toBe(0);

    lines = changeQuantity(lines, 6, -1);
    expect(quantityOf(lines, 6)).toBe(1);
    lines = changeQuantity(lines, 6, -1);
    expect(lines).toEqual([{ menu_item_id: 9, quantity: 1 }]);
  });

  it("totals from prices, never from typed amounts", () => {
    const price = (id: number) => ({ 6: 5000, 9: 2000 })[id as 6 | 9] ?? 0;
    expect(
      cartTotal(
        [
          { menu_item_id: 6, quantity: 2 },
          { menu_item_id: 9, quantity: 3 },
        ],
        price,
      ),
    ).toBe(16000);
  });
});

describe("menu categories (interim lookup)", () => {
  it("prefers the API's category", () => {
    expect(categoryOf({ item_name: "Rolex", category: "Mains" })).toBe("Mains");
  });

  it("knows the mock-up and seed menus by name", () => {
    expect(categoryOf({ item_name: "Rolex" })).toBe("Snacks");
    expect(categoryOf({ item_name: "  Fresh Mango Juice " })).toBe("Drinks");
    expect(categoryOf({ item_name: "Chicken Pilau" })).toBe("Mains");
    expect(categoryOf({ item_name: "Something new" })).toBeNull();
  });

  it("lists present categories in canonical order", () => {
    expect(
      categoriesPresent([
        { item_name: "Soda 300ml" },
        { item_name: "Rolex" },
        { item_name: "Pilau Beef" },
      ]),
    ).toEqual(["Mains", "Snacks", "Drinks"]);
  });
});

describe("activity log", () => {
  it("describes the trigger effects of an order, singular and plural", () => {
    const one = orderPlacedEntries(
      order("pending", { order_id: 1047, table_id: 6, items: [{} as never] }),
      "12:41",
    );
    expect(one.map((e) => e.text)).toEqual([
      "ORDER_ITEMS: 1 row inserted, item_subtotal = quantity × price",
      "TABLES: Table 6 free_status set to FALSE",
      "ORDERS: ORD-1047 inserted with status pending",
    ]);
    const many = orderPlacedEntries(
      order("pending", { items: [{} as never, {} as never] }),
      "12:41",
    );
    expect(many[0].text).toContain("2 rows inserted");
  });

  it("records a status change", () => {
    expect(statusChangedEntry(1044, "preparing", "12:42")).toEqual({
      time: "12:42",
      text: "ORDERS: ORD-1044 order_status set to preparing",
    });
  });

  it("keeps the six newest lines, newest first", () => {
    let log: { time: string; text: string }[] = [];
    for (let i = 1; i <= 8; i++) log = pushEntries(log, [{ time: "12:00", text: `line ${i}` }]);
    expect(log).toHaveLength(6);
    expect(log[0].text).toBe("line 8");
    expect(log[5].text).toBe("line 3");
  });
});

describe("restaurant time", () => {
  it("formats in Kampala time", () => {
    expect(clockTime(new Date("2026-10-11T09:41:00Z"))).toBe("12:41");
  });

  it("compares days in Kampala time, not UTC", () => {
    // 22:00 UTC is 01:00 the next day in Kampala.
    expect(isSameKampalaDay("2026-10-10T22:00:00Z", "2026-10-11T08:00:00Z")).toBe(true);
    expect(isSameKampalaDay("2026-10-10T20:00:00Z", "2026-10-11T08:00:00Z")).toBe(false);
  });
});
