import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";

import type { Route } from "./+types/payments";
import { CheckoutPanel } from "~/components/staff/CheckoutPanel";
import { PageHeader } from "~/components/staff/PageHeader";
import { PaymentQueue } from "~/components/staff/PaymentQueue";
import { ReceiptPanel, type Receipt } from "~/components/staff/ReceiptPanel";
import { ActivityLog, type ActivityEntry } from "~/components/ui/ActivityLog";
import { ButtonLink } from "~/components/ui/Button";
import { Chip } from "~/components/ui/Chip";
import { Panel } from "~/components/ui/Panel";
import { SCREENS, canAccess, getScreen } from "~/lib/access";
import { staffName } from "~/lib/api/auth";
import { ApiError } from "~/lib/api/client";
import { listStaffOrders } from "~/lib/api/orders";
import { payOrder } from "~/lib/api/payments";
import { fetchTables } from "~/lib/api/tables";
import { ROLE_LABELS } from "~/lib/api/types";
import { requireStaffSession, rethrowApiError } from "~/lib/auth-guard";
import { pushEntries } from "~/lib/domain/activity-log";
import {
  MOBILE_NETWORKS,
  apiMethod,
  awaitingPayment,
  canRecordPayments,
  paymentNumber,
  receiptMethod,
  type Method,
  type MobileNetwork,
} from "~/lib/domain/payments";
import { formatUgx } from "~/lib/money";
import { usePoll } from "~/lib/hooks/use-poll";
import { addToPaymentsTally, getPaymentsTally } from "~/lib/session";
import { clockTime } from "~/lib/time";
import {
  cashShortfall,
  changeDue,
  isValidPhone,
  parseTendered,
  shortfallMessage,
} from "~/lib/validation";

export const handle = { screen: "payments" } as const;

const screen = getScreen("payments");

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

const POLL_MS = 10_000;

export async function clientLoader() {
  const { staff } = requireStaffSession();
  // The shell shows a locked panel to roles without access; skip the fetch.
  if (!canAccess(staff.role, "payments")) return { staff, orders: [] };
  try {
    // A cashier's queue is served-and-unpaid on the server; a manager's is not.
    const orders = await listStaffOrders(staff.role === "cashier" ? undefined : ["served"]);
    return { staff, orders };
  } catch (error) {
    return rethrowApiError(error);
  }
}

function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? `Error: ${error.detail}`
    : "Error: Something went wrong. Please try again.";
}

const FIRST_ORDER_LINK = SCREENS.find((s) => s.key === "orders")!.path;

export default function Payments() {
  const { staff, orders } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const canRecord = canRecordPayments(staff.role);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [method, setMethod] = useState<Method>("cash");
  const [tendered, setTendered] = useState("");
  const [network, setNetwork] = useState<MobileNetwork>(MOBILE_NETWORKS[0]);
  const [phone, setPhone] = useState("");
  const [tried, setTried] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [paidIds, setPaidIds] = useState<ReadonlySet<number>>(new Set());
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [tally, setTally] = useState(getPaymentsTally);

  usePoll(() => {
    if (revalidator.state === "idle" && !paying) void revalidator.revalidate();
  }, POLL_MS);

  const queue = useMemo(
    () => awaitingPayment(orders, staff.role, new Date()).filter((o) => !paidIds.has(o.order_id)),
    [orders, staff.role, paidIds],
  );
  const selected =
    queue.find((o) => o.order_id === selectedId) ?? (receipt ? null : (queue[0] ?? null));

  const total = selected?.total ?? 0;
  const received = parseTendered(tendered);
  const shortfall = cashShortfall(received, total);
  const cashError =
    tried && method === "cash" && shortfall > 0 ? shortfallMessage(shortfall) : null;
  const phoneInvalid = tried && method === "momo" && !isValidPhone(phone);

  function resetForm() {
    setMethod("cash");
    setTendered("");
    setPhone("");
    setTried(false);
    setError(null);
  }

  function select(orderId: number) {
    setSelectedId(orderId);
    setReceipt(null);
    resetForm();
  }

  async function record() {
    if (!selected || !canRecord || paying) return;
    if (method === "cash" && shortfall > 0) {
      setTried(true);
      return;
    }
    if (method === "momo" && !isValidPhone(phone)) {
      setTried(true);
      return;
    }

    setPaying(true);
    setError(null);
    try {
      // The network and phone are collected for the cashier but the API only
      // stores the method (gap G11, issue #16), so only the method is sent.
      const { payment, sales_record } = await payOrder(selected.order_id, apiMethod(method));
      const time = clockTime();
      const number = paymentNumber(payment.payment_id);
      const label = receiptMethod(method, network);

      // Did the table come free? Only the tables endpoint can say (gap G1).
      const tables = await fetchTables().catch(() => null);
      const table = tables?.find((t) => t.table_id === selected.table_id);
      const tableLine =
        table === undefined
          ? `TABLES: Table ${selected.table_id} free_status set to TRUE unless another order there is unpaid`
          : table.free_status
            ? `TABLES: Table ${selected.table_id} free_status set to TRUE`
            : `TABLES: Table ${selected.table_id} still has an unpaid order`;

      setLog((entries) =>
        pushEntries(entries, [
          {
            time,
            text: `SALES_RECORD: ${formatUgx(sales_record?.total_amount ?? payment.amount)} added to today's sales`,
          },
          { time, text: tableLine },
          {
            time,
            text: `PAYMENTS: ${number} inserted for ORD-${selected.order_id} (${label}, ${formatUgx(payment.amount)})`,
          },
        ]),
      );
      setReceipt({
        paymentNumber: number,
        orderNumber: `ORD-${selected.order_id}`,
        table: `Table ${selected.table_id}`,
        method: label,
        amount: payment.amount,
        change: method === "cash" ? Math.max(received - payment.amount, 0) : 0,
      });
      setPaidIds((ids) => new Set(ids).add(selected.order_id));
      setTally(addToPaymentsTally(payment.amount));
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setPaying(false);
      void revalidator.revalidate();
    }
  }

  function nextOrder() {
    const next = queue[0] ?? null;
    setReceipt(null);
    setSelectedId(next?.order_id ?? null);
    resetForm();
  }

  return (
    <>
      <PageHeader title={screen.title} subtitle={screen.subtitle}>
        <div className="flex flex-wrap gap-2">
          <Chip>{queue.length} awaiting payment</Chip>
          {/* Gap G12: a cashier cannot read today's total, so this counts what
              was recorded on this device since sign-in. */}
          <Chip>Received this session {formatUgx(tally.total)}</Chip>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-start gap-6">
        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          <PaymentQueue
            orders={queue}
            selectedId={receipt ? null : (selected?.order_id ?? null)}
            onSelect={select}
          />
          <ActivityLog
            description="What changes in the tables when a payment is recorded."
            entries={log}
            empty="No activity yet. Record a payment to see the triggers fire."
          />
        </aside>

        <div className="min-w-0 flex-[2_1_520px]">
          {selected && !receipt ? (
            <CheckoutPanel
              order={selected}
              staffName={staffName(staff)}
              roleLabel={ROLE_LABELS[staff.role]}
              canRecord={canRecord}
              method={method}
              onMethod={(next) => {
                setMethod(next);
                setTried(false);
              }}
              tendered={tendered}
              onTendered={(digits) => {
                setTendered(digits);
                setTried(false);
              }}
              changeDue={changeDue(received, total)}
              cashError={cashError}
              network={network}
              onNetwork={setNetwork}
              phone={phone}
              onPhone={(value) => {
                setPhone(value);
                setTried(false);
              }}
              phoneInvalid={phoneInvalid}
              paying={paying}
              error={error}
              onRecord={() => void record()}
            />
          ) : null}

          {receipt ? (
            <ReceiptPanel
              receipt={receipt}
              cashier={staffName(staff)}
              roleLabel={ROLE_LABELS[staff.role]}
              moreWaiting={queue.length > 0}
              onNext={nextOrder}
            />
          ) : null}

          {!selected && !receipt ? (
            <Panel pad="lg">
              <h2 className="m-0 text-panel font-normal">All served orders are paid</h2>
              <p className="m-0 text-body tracking-body text-moss">
                New orders show up here once the kitchen marks them served.
              </p>
              <ButtonLink to={FIRST_ORDER_LINK} variant="tonal" className="self-start">
                Go to orders
              </ButtonLink>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
