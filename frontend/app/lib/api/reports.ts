import { parseUgx } from "../money";
import { request } from "./client";
import type {
  DailySalesRow,
  PaymentMethodRow,
  TableTurnoverRow,
  TopItemRow,
  WaiterRow,
} from "./types";

const BASE = "/api/staff/reports";

type Money = string | number;

interface Range {
  from: string;
  to: string;
}

async function rows<T>(path: string, range: Range, extra: Record<string, number> = {}) {
  const data = await request<{ rows: T[] }>(`${BASE}/${path}/`, {
    query: { from: range.from, to: range.to, ...extra },
  });
  return data.rows;
}

export interface ReportBundle {
  range: Range;
  daily: DailySalesRow[];
  topItems: TopItemRow[];
  waiters: WaiterRow[];
  methods: PaymentMethodRow[];
  turnover: TableTurnoverRow[];
}

/** The five manager reports for one date range, fetched together. */
export async function loadReports(range: Range, topLimit = 6): Promise<ReportBundle> {
  const [daily, topItems, waiters, methods, turnover] = await Promise.all([
    rows<{ sale_date: string; orders: number; revenue: Money }>("daily-sales", range),
    rows<{ menu_item_id: number; item_name: string; units_sold: number; revenue: Money }>(
      "top-items",
      range,
      { limit: topLimit },
    ),
    rows<{
      staff_id: number;
      username: string;
      display_name?: string;
      orders_handled: number;
      revenue: Money;
      avg_order_value: Money;
    }>("waiter-performance", range),
    rows<{ payment_method: string; payments: number; revenue: Money }>("payment-methods", range),
    rows<{
      table_id: number;
      orders_paid: number;
      parties_served: number;
      revenue: Money;
      turnover_per_day: number | string;
      seats?: number | null;
      avg_stay_minutes?: number | string | null;
    }>("table-turnover", range),
  ]);

  return {
    range,
    daily: daily.map((r) => ({ ...r, revenue: parseUgx(r.revenue) })),
    topItems: topItems.map((r) => ({ ...r, revenue: parseUgx(r.revenue) })),
    waiters: waiters.map((r) => ({
      staff_id: r.staff_id,
      username: r.display_name || r.username,
      orders_handled: r.orders_handled,
      revenue: parseUgx(r.revenue),
      avg_order_value: parseUgx(r.avg_order_value),
    })),
    methods: methods.map((r) => ({ ...r, revenue: parseUgx(r.revenue) })),
    turnover: turnover.map((r) => ({
      table_id: r.table_id,
      orders_paid: r.orders_paid,
      parties_served: r.parties_served,
      revenue: parseUgx(r.revenue),
      turnover_per_day: Number(r.turnover_per_day),
      seats: r.seats ?? undefined,
      avg_stay_minutes:
        r.avg_stay_minutes === null || r.avg_stay_minutes === undefined
          ? undefined
          : Number(r.avg_stay_minutes),
    })),
  };
}
