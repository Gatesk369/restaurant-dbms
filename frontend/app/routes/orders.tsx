import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";

import type { Route } from "./+types/orders";
import { ActiveOrders } from "~/components/staff/ActiveOrders";
import { MenuPicker } from "~/components/staff/MenuPicker";
import { OrderTicket, type TicketLine } from "~/components/staff/OrderTicket";
import { PageHeader } from "~/components/staff/PageHeader";
import { TablePanel } from "~/components/staff/TablePanel";
import { Chip } from "~/components/ui/Chip";
import { FieldError } from "~/components/ui/Field";
import { StatusMessage } from "~/components/ui/Toast";
import { getScreen } from "~/lib/access";
import { staffName } from "~/lib/api/auth";
import { ApiError } from "~/lib/api/client";
import { listStaffMenu } from "~/lib/api/menu";
import { changeOrderStatus, listStaffOrders, placeOrder } from "~/lib/api/orders";
import { fetchTables } from "~/lib/api/tables";
import {
  MENU_CATEGORIES,
  type MenuCategory,
  type Order,
  type OrderStatus,
  type Role,
} from "~/lib/api/types";
import { requireStaffSession, rethrowApiError } from "~/lib/auth-guard";
import { addToCart, cartTotal, changeQuantity, type CartLine } from "~/lib/domain/cart";
import { categoriesPresent, categoryOf } from "~/lib/domain/menu-categories";
import { isActive, statusLabel, type Filter } from "~/lib/domain/order-status";
import { deriveTables, parseTableIds } from "~/lib/domain/tables";
import { tableIdsSpec } from "~/lib/env";
import { usePoll } from "~/lib/hooks/use-poll";
import { isSameKampalaDay } from "~/lib/time";

export const handle = { screen: "orders" } as const;

const screen = getScreen("orders");

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

/** Wait staff open orders for tables; the manager may too (plan section 6.2). */
function canCreateOrders(role: Role): boolean {
  return role === "wait_staff" || role === "manager";
}

/** Wait staff and managers can ask for every status; the server scopes the rest. */
const BOARD_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"];

const POLL_MS = 10_000;

const CUSTOMERS = [{ value: "walkin", label: "Walk-in guest" }];

export async function clientLoader() {
  const { staff } = requireStaffSession();
  const creates = canCreateOrders(staff.role);
  try {
    const [orders, menu, apiTables] = await Promise.all([
      listStaffOrders(creates ? BOARD_STATUSES : undefined),
      creates ? listStaffMenu() : Promise.resolve([]),
      creates ? fetchTables() : Promise.resolve(null),
    ]);
    return { staff, orders, menu, apiTables };
  } catch (error) {
    return rethrowApiError(error);
  }
}

function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? `Error: ${error.detail}`
    : "Error: Something went wrong. Please try again.";
}

export default function Orders() {
  const { staff, orders, menu, apiTables } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const creates = canCreateOrders(staff.role);

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [category, setCategory] = useState("All");
  const [filter, setFilter] = useState<Filter>("All");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState(CUSTOMERS[0].value);
  const [toast, setToast] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

  usePoll(() => {
    if (revalidator.state === "idle") void revalidator.revalidate();
  }, POLL_MS);

  const active = useMemo(() => {
    const now = new Date();
    return orders
      .filter((order) => isActive(order, now, isSameKampalaDay))
      .sort((a, b) => b.order_time.localeCompare(a.order_time) || b.order_id - a.order_id);
  }, [orders]);

  const tables = useMemo(
    () => (creates ? (apiTables ?? deriveTables(parseTableIds(tableIdsSpec), active)) : []),
    [creates, apiTables, active],
  );
  const freeCount = tables.filter((t) => t.free_status).length;

  // A table that filled up since it was picked is no longer selected.
  const table = tables.some((t) => t.table_id === selectedTable && t.free_status)
    ? selectedTable
    : null;

  // The API sorts by name; the mock-up groups by category and keeps menu order.
  const pickable = useMemo(() => {
    const rank = (item: (typeof menu)[number]) => {
      const index = MENU_CATEGORIES.indexOf(categoryOf(item) as MenuCategory);
      return index === -1 ? MENU_CATEGORIES.length : index;
    };
    return menu
      .filter((i) => i.availability_status && !i.archived)
      .sort((a, b) => rank(a) - rank(b) || a.menu_item_id - b.menu_item_id);
  }, [menu]);
  const menuById = useMemo(() => new Map(pickable.map((i) => [i.menu_item_id, i])), [pickable]);
  const categories = useMemo(() => categoriesPresent(pickable), [pickable]);
  const shownItems = pickable.filter((i) => category === "All" || categoryOf(i) === category);
  const quantities = useMemo(
    () => new Map(lines.map((l) => [l.menu_item_id, l.quantity])),
    [lines],
  );

  const ticketLines: TicketLine[] = lines.flatMap((line) => {
    const item = menuById.get(line.menu_item_id);
    return item
      ? [
          {
            menuItemId: item.menu_item_id,
            name: item.item_name,
            quantity: line.quantity,
            unitPrice: item.price,
          },
        ]
      : [];
  });
  const total = cartTotal(lines, (id) => menuById.get(id)?.price ?? 0);

  const noTable = table === null;
  const noItems = lines.length === 0;
  const missing =
    noTable && noItems
      ? "Choose a table and add at least one item."
      : noTable
        ? "Choose a table."
        : noItems
          ? "Add at least one item."
          : null;

  async function place() {
    if (table === null || noItems || placing) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      const note = notes.trim();
      const placed = await placeOrder(
        table,
        lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
          ...(note ? { special_instructions: note } : {}),
        })),
      );
      setToast(
        `Order ORD-${placed.order_id} placed for Table ${placed.table_id}. The kitchen can see it as pending.`,
      );
      setSelectedTable(null);
      setLines([]);
      setNotes("");
      setCustomer(CUSTOMERS[0].value);
      void revalidator.revalidate();
    } catch (error) {
      setPlaceError(messageOf(error));
      void revalidator.revalidate();
    } finally {
      setPlacing(false);
    }
  }

  async function advance(order: Order, to: OrderStatus) {
    setBusyOrderId(order.order_id);
    setBoardError(null);
    setToast("");
    try {
      const updated = await changeOrderStatus(order.order_id, to);
      setToast(`Order ORD-${updated.order_id} is now ${statusLabel(updated.order_status)}.`);
    } catch (error) {
      setBoardError(messageOf(error));
    } finally {
      setBusyOrderId(null);
      void revalidator.revalidate();
    }
  }

  return (
    <>
      <PageHeader title={screen.title} subtitle={screen.subtitle}>
        {creates ? <Chip>{`${freeCount} of ${tables.length} tables free`}</Chip> : null}
      </PageHeader>

      {toast ? <StatusMessage>{toast}</StatusMessage> : null}

      {creates ? (
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <TablePanel
              tables={tables}
              selected={table}
              onSelect={(id) => {
                setSelectedTable(id);
                setToast("");
              }}
            />
            <MenuPicker
              items={shownItems}
              categories={categories}
              category={category}
              onCategory={setCategory}
              quantities={quantities}
              onAdd={(id) => {
                setLines((current) => addToCart(current, id));
                setToast("");
              }}
            />
          </div>
          <aside className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
            <OrderTicket
              tableText={table === null ? "Not chosen" : `Table ${table}`}
              waiterName={staffName(staff)}
              customers={CUSTOMERS}
              customer={customer}
              onCustomer={setCustomer}
              lines={ticketLines}
              onIncrement={(id) => setLines((current) => changeQuantity(current, id, 1))}
              onDecrement={(id) => setLines((current) => changeQuantity(current, id, -1))}
              notes={notes}
              onNotes={setNotes}
              total={total}
              missing={missing}
              placing={placing}
              error={placeError}
              onPlace={() => void place()}
            />
          </aside>
        </div>
      ) : null}

      {boardError ? <FieldError>{boardError}</FieldError> : null}

      <ActiveOrders
        orders={active}
        role={staff.role}
        staffId={staff.staff_id}
        filter={filter}
        onFilter={setFilter}
        busyOrderId={busyOrderId}
        onAdvance={(order, to) => void advance(order, to)}
      />
    </>
  );
}
