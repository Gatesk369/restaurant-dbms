import { describe, expect, it } from "vitest";

import { menuItems, orders, paymentQueue, reportMonth, reportWeek, tables } from "../fixtures";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/**
 * The fixtures must reproduce the figures printed on the mock-up artboards;
 * visual tests are only meaningful if the data is the same.
 */
describe("mock-up fixtures", () => {
  it("has 12 tables with 2, 3, 4, 5, 7, 9 and 11 occupied", () => {
    expect(tables).toHaveLength(12);
    const busy = tables.filter((t) => !t.free_status).map((t) => t.table_id);
    expect(busy).toEqual([2, 3, 4, 5, 7, 9, 11]);
  });

  it("lists 18 menu items with MI-005 unavailable and MI-017 archived", () => {
    expect(menuItems).toHaveLength(18);
    expect(menuItems[4]).toMatchObject({
      item_name: "Grilled Goat Ribs",
      availability_status: false,
    });
    expect(menuItems[16]).toMatchObject({ item_name: "Banana Fritters", archived: true });
  });

  it("queues ORD-1039, 1041, 1042 and 1045 for payment with the artboard totals", () => {
    expect(paymentQueue.map((o) => [o.order_id, o.total])).toEqual([
      [1039, 72000],
      [1041, 44000],
      [1042, 46000],
      [1045, 60000],
    ]);
  });

  it("keeps line subtotals equal to quantity x price", () => {
    for (const order of orders) {
      for (const line of order.items) {
        expect(line.item_subtotal).toBe(line.quantity * line.unit_price);
      }
    }
  });

  it("reproduces the report summary figures", () => {
    const week = sum(reportWeek.daily.map((d) => d.revenue));
    expect(week).toBe(10820000);
    expect(sum(reportWeek.daily.map((d) => d.orders))).toBe(345);
    expect(Math.round(week / 345)).toBe(31362);

    expect(sum(reportMonth.daily.map((d) => d.revenue))).toBe(40540000);
    expect(sum(reportMonth.daily.map((d) => d.orders))).toBe(1321);
  });

  it("splits revenue between payment methods without losing a shilling", () => {
    for (const report of [reportWeek, reportMonth]) {
      const total = sum(report.daily.map((d) => d.revenue));
      expect(sum(report.paymentMethods.map((m) => m.revenue))).toBe(total);
    }
  });
});
