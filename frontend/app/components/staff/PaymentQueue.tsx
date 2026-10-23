import { Panel, PanelHeading } from "~/components/ui/Panel";
import type { Order } from "~/lib/api/types";
import { cx } from "~/lib/cx";
import { formatUgx } from "~/lib/money";

interface PaymentQueueProps {
  orders: readonly Order[];
  selectedId: number | null;
  onSelect: (orderId: number) => void;
}

/** "Served orders": the checkout queue, oldest first. */
export function PaymentQueue({ orders, selectedId, onSelect }: PaymentQueueProps) {
  return (
    <Panel>
      <PanelHeading title="Served orders" />
      {orders.length === 0 ? (
        <p className="m-0 rounded-md bg-tea p-4 text-body tracking-body">
          Nothing to collect. Orders appear here when the assigned waiter marks them served.
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {orders.map((order) => {
          const selected = order.order_id === selectedId;
          return (
            <button
              key={order.order_id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(order.order_id)}
              className={cx(
                "box-border flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border-0 px-3 py-2 text-left hover:brightness-95",
                selected ? "bg-moss text-white" : "bg-tea text-forest",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-body font-bold tracking-bold">
                  ORD-{order.order_id} · Table {order.table_id}
                </span>
                <span
                  className={cx(
                    "text-label tracking-caption",
                    selected ? "text-white" : "text-moss",
                  )}
                >
                  {order.customer_name || "Walk-in guest"}
                </span>
              </span>
              <span className="flex-none text-body font-bold tabular-nums">
                {formatUgx(order.total)}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
