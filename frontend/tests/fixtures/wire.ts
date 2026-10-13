/**
 * The fixtures as the API would send them: decimal strings for money, and
 * backend statuses (the mock-up's "pending" is a confirmed order, since only
 * an assigned waiter's order can be started by the kitchen).
 */
import type { MenuItem, OrderStatus } from "../../app/lib/api/types";
import {
  menuItems,
  orders,
  reportMonth,
  reportWeek,
  tables,
  type MockOrder,
  type ReportFixture,
} from "./mockup-data";

const decimal = (n: number) => n.toFixed(2);

const STATUS: Record<string, OrderStatus> = {
  pending: "confirmed",
  preparing: "preparing",
  served: "served",
  ready: "ready",
  confirmed: "confirmed",
};

export function wireMenuItem(item: MenuItem, backendFieldsOnly = true) {
  const base = {
    menu_item_id: item.menu_item_id,
    item_name: item.item_name,
    description: item.description,
    price: decimal(item.price),
    availability_status: item.availability_status,
  };
  // Gap fields (category, archived, image) are not served yet.
  return backendFieldsOnly ? base : { ...base, category: item.category, archived: item.archived };
}

/** `now` makes order times recent so "today" filters keep the orders. */
export function wireOrder(order: MockOrder, now: Date = new Date()) {
  const minutesAgo = Math.max(1050 - order.order_id, 1);
  return {
    order_id: order.order_id,
    table_id: order.table_id,
    order_status: STATUS[order.order_status] ?? order.order_status,
    order_time: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    staff_id: order.staff_id,
    waiter: order.waiter,
    customer_name: order.customer_name,
    total: decimal(order.total),
    items: order.items.map((item) => ({
      order_item_id: item.order_item_id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      unit_price: decimal(item.unit_price),
      quantity: item.quantity,
      item_subtotal: decimal(item.item_subtotal),
      special_instructions: item.special_instructions,
    })),
  };
}

export type WireOrder = ReturnType<typeof wireOrder>;

export function wireTables() {
  return tables.map((t) => ({ table_id: t.table_id, free_status: t.free_status, seats: t.seats }));
}

export function wireOrders(now?: Date) {
  return orders.map((o) => wireOrder(o, now));
}

export { menuItems };

// --- Reports -----------------------------------------------------------------

export interface ReportFeatures {
  /** table-turnover rows carry `seats` (gap G2). */
  seats?: boolean;
  /** table-turnover rows carry `avg_stay_minutes` (gap G13). */
  avgStay?: boolean;
  /** payment-methods is grouped by network (gap G11). */
  networks?: boolean;
}

/** Spreads a total over `n` days, the remainder landing on the last day. */
function spread(total: number, n: number): number[] {
  const each = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - each * (n - 1) : each));
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The fixture a request for `from` should get, or null for any other range. */
export function reportFor(from: string): { fixture: ReportFixture; weekly: boolean } | null {
  if (from === reportWeek.from) return { fixture: reportWeek, weekly: false };
  if (from === reportMonth.from) return { fixture: reportMonth, weekly: true };
  return null;
}

export function wireReport(
  kind: string,
  fixture: ReportFixture,
  weekly: boolean,
  features: ReportFeatures = {},
): { from: string; to: string; rows: unknown[] } {
  const decimal = (n: number) => n.toFixed(2);
  const base = { from: fixture.from, to: fixture.to };

  switch (kind) {
    case "daily-sales": {
      // The API always returns days; the 4-week fixture is stored per week.
      const rows = weekly
        ? fixture.daily.flatMap((week) => {
            const revenue = spread(week.revenue, 7);
            const orders = spread(week.orders, 7);
            return revenue.map((r, i) => ({
              sale_date: addDays(week.sale_date, i),
              orders: orders[i],
              revenue: decimal(r),
            }));
          })
        : fixture.daily.map((d) => ({
            sale_date: d.sale_date,
            orders: d.orders,
            revenue: decimal(d.revenue),
          }));
      return { ...base, rows };
    }
    case "top-items":
      return {
        ...base,
        rows: fixture.topItems.map((r) => ({ ...r, revenue: decimal(r.revenue) })),
      };
    case "waiter-performance":
      return {
        ...base,
        rows: fixture.waiters.map((r) => ({
          ...r,
          revenue: decimal(r.revenue),
          avg_order_value: decimal(r.avg_order_value),
        })),
      };
    case "payment-methods": {
      const total = fixture.paymentMethods.reduce((sum, r) => sum + r.revenue, 0);
      if (!features.networks) {
        return {
          ...base,
          rows: fixture.paymentMethods.map((r) => ({ ...r, revenue: decimal(r.revenue) })),
        };
      }
      const cash = Math.round(total * 0.41);
      const mtn = Math.round(total * 0.38);
      return {
        ...base,
        rows: [
          { payment_method: "Cash", payments: 0, revenue: decimal(cash) },
          { payment_method: "MTN Mobile Money", payments: 0, revenue: decimal(mtn) },
          { payment_method: "Airtel Money", payments: 0, revenue: decimal(total - cash - mtn) },
        ],
      };
    }
    case "table-turnover":
      return {
        ...base,
        rows: fixture.turnover.map((r) => ({
          table_id: r.table_id,
          orders_paid: r.orders_paid,
          parties_served: r.parties_served,
          revenue: decimal(r.revenue),
          turnover_per_day: r.turnover_per_day,
          ...(features.seats ? { seats: r.seats } : {}),
          ...(features.avgStay ? { avg_stay_minutes: r.avg_stay_minutes } : {}),
        })),
      };
    default:
      return { ...base, rows: [] };
  }
}
