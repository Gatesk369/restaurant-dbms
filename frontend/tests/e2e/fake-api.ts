import type { Page, Route } from "@playwright/test";

import { ORDER_PICKER_IDS } from "../fixtures/mockup-data";
import {
  menuItems,
  reportFor,
  wireMenuItem,
  wireOrders,
  wireReport,
  wireTables,
  type ReportFeatures,
  type WireOrder,
} from "../fixtures/wire";

const API = "http://127.0.0.1:8000";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

export interface Call {
  method: string;
  path: string;
  query: string;
  body: unknown;
  sessionToken: string | null;
}

export interface FakeOptions {
  /** Serve GET /api/tables/ (gap G1 closed). Otherwise it is a 404. */
  tablesEndpoint?: boolean;
  /** Serve POST /api/staff/orders/ (gap G3 closed). Otherwise a 405. */
  staffCreate?: boolean;
  /** Replace the order list (wire shape). */
  orders?: WireOrder[];
  /** Fail the next order placement with this 400 message. */
  placeError?: string;
  /** Answer the order queue with 401 (an ended session). */
  expired?: boolean;
  /**
   * "cashier": the queue is served-and-unpaid, as the server does for that
   * role. Default "all".
   */
  queueView?: "all" | "cashier";
  /**
   * Which menu columns the "API" has: `category` (gap G5) and `archived`
   * (gap G6). Both off by default, like the backend today.
   */
  menuFeatures?: { category?: boolean; archived?: boolean };
  /** Which optional report columns the "API" serves (gaps G2, G11, G13). */
  reportFeatures?: ReportFeatures;
  /** Fail payments with this status and detail (403, 409, 400). */
  payError?: { status: number; detail: string };
}

const NEXT: Record<string, string> = {
  confirmed: "preparing",
  preparing: "ready",
  ready: "served",
};

/**
 * A small in-memory stand-in for the Django API, enough for the Orders flows.
 * It records every call so tests can assert on what the app sent.
 */
export class FakeApi {
  orders: WireOrder[];
  calls: Call[] = [];
  nextOrderId = 1047;
  nextCustomerId = 5000;
  nextPaymentId = 388;
  /** Orders that have a payment. */
  paid = new Set<number>();
  tables = wireTables();
  menu: Record<string, unknown>[];
  nextMenuId = 19;
  private tokens = new Map<string, number>();
  private readonly now = new Date();

  constructor(private options: FakeOptions = {}) {
    this.orders = options.orders ?? wireOrders(this.now);
    const features = options.menuFeatures ?? {};
    this.menu = menuItems.map((item) => {
      const row: Record<string, unknown> = { ...wireMenuItem(item) };
      if (features.category) row.category = item.category;
      if (features.archived) row.archived = item.archived ?? false;
      return row;
    });
  }

  set(options: Partial<FakeOptions>) {
    Object.assign(this.options, options);
  }

  callsTo(method: string, path: string): Call[] {
    return this.calls.filter((c) => c.method === method && c.path === path);
  }

  async install(page: Page) {
    await page.route(
      (url) => url.href.startsWith(`${API}/api/`),
      (route) => this.handle(route),
    );
  }

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({
      status,
      headers: { ...CORS, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  private async handle(route: Route) {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    let body: unknown = null;
    try {
      body = request.postDataJSON();
    } catch {
      body = null;
    }
    this.calls.push({
      method,
      path,
      query: url.search,
      body,
      sessionToken: request.headers()["x-session-token"] ?? null,
    });

    if (path === "/api/tables/" && method === "GET") {
      if (!this.options.tablesEndpoint) return this.json(route, 404, { detail: "Not found." });
      return this.json(route, 200, this.tables);
    }

    if (path === "/api/staff/menu/" && method === "GET") {
      if (url.searchParams.get("include_unavailable") === "1") {
        return this.json(route, 200, this.menu);
      }
      // What staff can order: the mock-up's picker items that are available.
      const rows = ORDER_PICKER_IDS.map((id) => this.menu.find((r) => r.menu_item_id === id))
        .filter((r): r is Record<string, unknown> => r !== undefined)
        .filter((r) => r.availability_status === true);
      return this.json(route, 200, rows);
    }

    if (path === "/api/staff/menu/" && method === "POST") {
      return this.createMenuItem(route, body as Record<string, unknown>);
    }

    const menuRow = path.match(/^\/api\/staff\/menu\/(\d+)\/$/);
    if (menuRow && (method === "PATCH" || method === "DELETE")) {
      return this.changeMenuItem(
        route,
        Number(menuRow[1]),
        method,
        body as Record<string, unknown>,
      );
    }

    if (path === "/api/staff/orders/" && method === "GET") {
      if (this.options.expired) {
        return this.json(route, 401, { detail: "Invalid or expired token." });
      }
      if (this.options.queueView === "cashier") {
        const unpaid = this.orders.filter(
          (o) => o.order_status === "served" && !this.paid.has(o.order_id),
        );
        return this.json(route, 200, unpaid);
      }
      const wanted = url.searchParams.get("status")?.split(",").filter(Boolean);
      const rows = wanted
        ? this.orders.filter((o) => wanted.includes(o.order_status))
        : this.orders;
      return this.json(route, 200, rows);
    }

    if (path === "/api/staff/orders/" && method === "POST") {
      if (!this.options.staffCreate)
        return this.json(route, 405, { detail: 'Method "POST" not allowed.' });
      return this.create(route, (body as { table_id: number }).table_id, body);
    }

    const status = path.match(/^\/api\/staff\/orders\/(\d+)\/status\/$/);
    if (status && method === "POST") {
      const order = this.orders.find((o) => o.order_id === Number(status[1]));
      const to = (body as { status: string }).status;
      if (!order) return this.json(route, 404, { detail: "Order not found." });
      if (NEXT[order.order_status] !== to) {
        return this.json(route, 400, {
          status: `Can't move an order from ${order.order_status} to ${to}.`,
        });
      }
      order.order_status = to as WireOrder["order_status"];
      return this.json(route, 200, order);
    }

    const report = path.match(/^\/api\/staff\/reports\/([a-z-]+)\/$/);
    if (report && method === "GET") {
      if (this.options.expired) {
        return this.json(route, 401, { detail: "Invalid or expired token." });
      }
      const from = url.searchParams.get("from") ?? "";
      const match = reportFor(from);
      if (!match) {
        return this.json(route, 200, { from, to: url.searchParams.get("to"), rows: [] });
      }
      return this.json(
        route,
        200,
        wireReport(report[1], match.fixture, match.weekly, this.options.reportFeatures),
      );
    }

    const pay = path.match(/^\/api\/staff\/orders\/(\d+)\/pay\/$/);
    if (pay && method === "POST") {
      return this.pay(route, Number(pay[1]), body as { payment_method: string });
    }

    if (path === "/api/customers/" && method === "POST") {
      const token = `token-${this.nextCustomerId}`;
      this.tokens.set(token, (body as { table_id: number }).table_id);
      return this.json(route, 201, {
        customer_id: this.nextCustomerId++,
        table_id: (body as { table_id: number }).table_id,
        session_token: token,
      });
    }

    if (path === "/api/my/orders/" && method === "POST") {
      const token = request.headers()["x-session-token"] ?? "";
      const table = this.tokens.get(token);
      if (table === undefined)
        return this.json(route, 401, { detail: "Invalid or expired session." });
      return this.create(route, table, body);
    }

    return this.json(route, 404, { detail: `Unhandled ${method} ${path}` });
  }

  private createMenuItem(route: Route, body: Record<string, unknown>) {
    const name = String(body.item_name ?? "").trim();
    const price = Number(body.price);
    if (!name || name.length > 100) {
      return this.json(route, 400, { item_name: "Enter a name of 1 to 100 characters." });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return this.json(route, 400, { price: "Enter a price greater than 0." });
    }
    const features = this.options.menuFeatures ?? {};
    const row: Record<string, unknown> = {
      menu_item_id: this.nextMenuId++,
      item_name: name,
      description: null,
      price: price.toFixed(2),
      availability_status: body.availability_status !== false,
    };
    if (features.category) row.category = body.category ?? "Mains";
    if (features.archived) row.archived = false;
    this.menu.push(row);
    return this.json(route, 201, row);
  }

  private changeMenuItem(
    route: Route,
    id: number,
    method: string,
    body: Record<string, unknown> | null,
  ) {
    const row = this.menu.find((r) => r.menu_item_id === id);
    if (!row) return this.json(route, 404, { detail: "Menu item not found." });
    const features = this.options.menuFeatures ?? {};

    if (method === "DELETE") {
      if (features.archived) row.archived = true;
      else row.availability_status = false;
      return this.json(route, 200, row);
    }
    const patch = body ?? {};
    if ("item_name" in patch) {
      const name = String(patch.item_name).trim();
      if (!name)
        return this.json(route, 400, { item_name: "Enter a name of 1 to 100 characters." });
      row.item_name = name;
    }
    if ("price" in patch) {
      const price = Number(patch.price);
      if (!Number.isFinite(price) || price <= 0) {
        return this.json(route, 400, { price: "Enter a price greater than 0." });
      }
      row.price = price.toFixed(2);
    }
    if ("availability_status" in patch) row.availability_status = patch.availability_status;
    // Like the real whitelist, unknown columns are ignored rather than rejected.
    if (features.archived && "archived" in patch) row.archived = patch.archived;
    if (features.category && "category" in patch) row.category = patch.category;
    return this.json(route, 200, row);
  }

  private pay(route: Route, orderId: number, body: { payment_method: string }) {
    if (this.options.payError) {
      const { status, detail } = this.options.payError;
      return this.json(route, status, { detail });
    }
    const order = this.orders.find((o) => o.order_id === orderId);
    if (!order) return this.json(route, 404, { detail: "Order not found." });
    if (order.order_status !== "served") {
      return this.json(route, 400, { detail: "Only served orders can be paid." });
    }
    if (this.paid.has(orderId)) {
      return this.json(route, 409, { detail: "This order has already been paid." });
    }
    if (!["Cash", "Mobile Money"].includes(body.payment_method)) {
      return this.json(route, 400, { payment_method: "Use 'Cash' or 'Mobile Money'." });
    }
    this.paid.add(orderId);
    const paymentId = this.nextPaymentId++;
    // The trigger frees the table when no other unpaid order is left on it.
    const stillHeld = this.orders.some(
      (o) =>
        o.table_id === order.table_id &&
        o.order_id !== orderId &&
        o.order_status !== "cancelled" &&
        !this.paid.has(o.order_id),
    );
    const table = this.tables.find((x) => x.table_id === order.table_id);
    if (table && !stillHeld) table.free_status = true;
    return this.json(route, 201, {
      payment: {
        payment_id: paymentId,
        order_id: orderId,
        amount: order.total,
        payment_method: body.payment_method,
        cashier_id: 1001,
        transaction_time: new Date().toISOString(),
      },
      sales_record: {
        sales_record_id: 9000 + paymentId,
        order_id: orderId,
        payment_id: paymentId,
        total_amount: order.total,
        sale_date: new Date().toISOString().slice(0, 10),
      },
    });
  }

  private create(route: Route, tableId: number, body: unknown) {
    if (this.options.placeError) {
      const message = this.options.placeError;
      this.options.placeError = undefined;
      return this.json(route, 400, { items: message });
    }
    const lines = (
      body as { items: { menu_item_id: number; quantity: number; special_instructions?: string }[] }
    ).items;
    const id = this.nextOrderId++;
    const items = lines.map((line, i) => {
      const item = menuItems[line.menu_item_id - 1];
      return {
        order_item_id: id * 10 + i,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        unit_price: item.price.toFixed(2),
        quantity: line.quantity,
        item_subtotal: (item.price * line.quantity).toFixed(2),
        special_instructions: line.special_instructions ?? null,
      };
    });
    const order = {
      order_id: id,
      table_id: tableId,
      order_status: "pending",
      order_time: new Date().toISOString(),
      staff_id: 1004,
      waiter: "okello.peter",
      total: items.reduce((s, i) => s + Number(i.item_subtotal), 0).toFixed(2),
      items,
    } as unknown as WireOrder;
    this.orders.unshift(order);
    return this.json(route, 201, order);
  }
}
