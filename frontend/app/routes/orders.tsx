import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";

import type { Route } from "./+types/orders";
import { ActiveOrders } from "~/components/staff/ActiveOrders";
import { PageHeader } from "~/components/staff/PageHeader";
import { PaidOrderHistory } from "~/components/staff/PaidOrderHistory";
import { ButtonLink } from "~/components/ui/Button";
import { FieldError } from "~/components/ui/Field";
import { Panel } from "~/components/ui/Panel";
import { StatusMessage } from "~/components/ui/Toast";
import { getScreen } from "~/lib/access";
import { ApiError } from "~/lib/api/client";
import { changeOrderStatus, listStaffOrders } from "~/lib/api/orders";
import { loadPaymentHistory } from "~/lib/api/reports";
import type { Order, OrderStatus } from "~/lib/api/types";
import { requireStaffScreen, rethrowApiError } from "~/lib/auth-guard";
import { isActive, nextAction, statusLabel, type Filter } from "~/lib/domain/order-status";
import { usePoll } from "~/lib/hooks/use-poll";
import { isSameKampalaDay, kampalaDate } from "~/lib/time";

export const handle = { screen: "orders" } as const;
const screen = getScreen("orders");
const BOARD_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"];
const POLL_MS = 10_000;

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

export async function clientLoader() {
  const { staff } = requireStaffScreen("orders");
  try {
    // The API scopes wait staff to assigned orders, kitchen to open orders,
    // and cashiers to served, unpaid orders. Managers can see the whole board.
    const orders = await listStaffOrders(BOARD_STATUSES);
    const today = kampalaDate();
    const todayHistory =
      staff.role === "manager" ? await loadPaymentHistory({ from: today, to: today }, 0, 10) : null;
    return { staff, orders, todayHistory, today };
  } catch (error) {
    return rethrowApiError(error);
  }
}

export default function Orders() {
  const { staff, orders, todayHistory, today } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [filter, setFilter] = useState<Filter>("All");
  const [toast, setToast] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

  usePoll(() => {
    if (revalidator.state === "idle" && busyOrderId === null) void revalidator.revalidate();
  }, POLL_MS);

  const active = useMemo(() => {
    const now = new Date();
    return orders
      .filter((order) => staff.role !== "wait_staff" || order.staff_id === staff.staff_id)
      .filter((order) => isActive(order, now, isSameKampalaDay))
      .sort((a, b) => b.order_time.localeCompare(a.order_time) || b.order_id - a.order_id);
  }, [orders, staff.role, staff.staff_id]);

  async function advance(order: Order, to: OrderStatus) {
    const action = nextAction(staff.role, order, staff.staff_id);
    if (busyOrderId !== null || action.kind !== "advance" || action.to !== to) return;
    setBusyOrderId(order.order_id);
    setBoardError(null);
    setToast("");
    try {
      const updated = await changeOrderStatus(order.order_id, to);
      setToast(`Order ORD-${updated.order_id} is now ${statusLabel(updated.order_status)}.`);
    } catch (error) {
      setBoardError(
        error instanceof ApiError
          ? `Error: ${error.detail}`
          : "Error: Something went wrong. Please try again.",
      );
    } finally {
      try {
        await revalidator.revalidate();
      } finally {
        setBusyOrderId(null);
      }
    }
  }

  return (
    <>
      <PageHeader
        title={screen.title}
        subtitle={
          staff.role === "wait_staff"
            ? "Deliver your assigned orders, mark them served, and bring payment options to the table."
            : screen.subtitle
        }
      />
      {toast ? <StatusMessage>{toast}</StatusMessage> : null}
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
      {staff.role === "manager" && todayHistory ? (
        <>
          <PaidOrderHistory page={todayHistory} title="Paid orders today" compact />
          <Panel pad="md" className="mt-3">
            <p className="m-0 text-body tracking-body">
              Showing paid orders for {today}. View the full order history and choose any date range
              in Reports.
            </p>
            <ButtonLink to="/reports#history" variant="tonal" className="self-start">
              View full history in reports
            </ButtonLink>
          </Panel>
        </>
      ) : null}
    </>
  );
}
