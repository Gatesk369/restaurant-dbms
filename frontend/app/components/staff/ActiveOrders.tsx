import { Button, ButtonLink } from "~/components/ui/Button";
import { Chip, ToggleChip, ToggleGroup } from "~/components/ui/Chip";
import { DataCell, DataHeader, DataRow, DataTable } from "~/components/ui/DataTable";
import { Panel, PanelHeading } from "~/components/ui/Panel";
import type { Order, OrderStatus, Role } from "~/lib/api/types";
import {
  FILTERS,
  filterOf,
  nextAction,
  statusLabel,
  statusTone,
  type Filter,
} from "~/lib/domain/order-status";
import { formatAmount } from "~/lib/money";

const COLUMNS = "96px 64px 1.1fr 2fr 120px 120px 168px";

interface ActiveOrdersProps {
  orders: readonly Order[];
  role: Role;
  staffId: number;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  /** Order id whose status change is in flight. */
  busyOrderId: number | null;
  onAdvance: (order: Order, to: OrderStatus) => void;
}

function countFor(orders: readonly Order[], filter: Filter): number {
  return filter === "All"
    ? orders.length
    : orders.filter((o) => filterOf(o.order_status) === filter).length;
}

/** "Active orders": filter chips and the ARIA table with role-aware next steps. */
export function ActiveOrders({
  orders,
  role,
  staffId,
  filter,
  onFilter,
  busyOrderId,
  onAdvance,
}: ActiveOrdersProps) {
  const visible = orders.filter((o) => filter === "All" || filterOf(o.order_status) === filter);

  return (
    <Panel>
      <PanelHeading
        level="title"
        title={role === "wait_staff" ? "Assigned orders" : "Active orders"}
        caption="Kitchen staff prepare orders and mark them ready. Assigned wait staff deliver and mark them served."
      >
        <ToggleGroup label="Order status">
          {FILTERS.map((name) => (
            <ToggleChip key={name} pressed={filter === name} onClick={() => onFilter(name)}>
              {`${name} (${countFor(orders, name)})`}
            </ToggleChip>
          ))}
        </ToggleGroup>
      </PanelHeading>

      {visible.length === 0 ? (
        <p role="status" className="m-0 text-body text-moss">
          {role === "wait_staff"
            ? "No assigned orders match this filter. New orders appear here when assigned to you."
            : "No active orders match this filter."}
        </p>
      ) : null}
      <DataTable label="Active orders" columns={COLUMNS} minWidth={960}>
        <DataHeader>
          <DataCell header>Order</DataCell>
          <DataCell header>Table</DataCell>
          <DataCell header>Customer</DataCell>
          <DataCell header>Items</DataCell>
          <DataCell header align="right">
            Total
          </DataCell>
          <DataCell header>Status</DataCell>
          <DataCell header>Next step</DataCell>
        </DataHeader>
        {visible.map((order) => {
          const action = nextAction(role, order, staffId);
          return (
            <DataRow key={order.order_id} hoverable>
              <DataCell className="font-bold">ORD-{order.order_id}</DataCell>
              <DataCell>T{order.table_id}</DataCell>
              <DataCell>
                <div>{order.customer_name || "Walk-in guest"}</div>
                {order.waiter ? <div className="text-label text-moss">{order.waiter}</div> : null}
              </DataCell>
              <DataCell>
                <div>
                  {order.items.map((item) => `${item.quantity}× ${item.item_name}`).join(", ")}
                </div>
                {order.items
                  .filter((item) => item.special_instructions)
                  .map((item) => (
                    <div key={item.order_item_id} className="mt-1 text-label text-moss">
                      {item.item_name}: {item.special_instructions}
                    </div>
                  ))}
              </DataCell>
              <DataCell align="right" className="font-bold tabular-nums">
                {`UGX ${formatAmount(order.total)}`}
              </DataCell>
              <DataCell>
                <Chip tone={statusTone(order.order_status)}>{statusLabel(order.order_status)}</Chip>
              </DataCell>
              <DataCell>
                {action.kind === "advance" ? (
                  <Button
                    variant="tonal"
                    pending={busyOrderId === order.order_id}
                    disabled={busyOrderId !== null}
                    onClick={() => onAdvance(order, action.to)}
                  >
                    {action.label}
                  </Button>
                ) : action.kind === "pay" ? (
                  <ButtonLink to="/payments" variant="primary">
                    Take payment
                  </ButtonLink>
                ) : (
                  <span className="text-label tracking-caption text-moss">{action.text}</span>
                )}
              </DataCell>
            </DataRow>
          );
        })}
      </DataTable>
    </Panel>
  );
}
