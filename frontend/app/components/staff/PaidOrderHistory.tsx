import { Button } from "~/components/ui/Button";
import { DataCell, DataHeader, DataRow, DataTable } from "~/components/ui/DataTable";
import { Panel } from "~/components/ui/Panel";
import type { PaymentHistoryPage } from "~/lib/api/reports";
import { formatUgx } from "~/lib/money";

export function PaidOrderTable({ page }: { page: PaymentHistoryPage }) {
  return (
    <DataTable
      label="Paid order history"
      columns="100px 90px 90px 70px minmax(110px,1fr) minmax(110px,1fr) 120px 110px"
      minWidth={940}
    >
      <DataHeader>
        <DataCell header>Paid</DataCell>
        <DataCell header>Order</DataCell>
        <DataCell header>Payment</DataCell>
        <DataCell header>Table</DataCell>
        <DataCell header>Waiter</DataCell>
        <DataCell header>Cashier</DataCell>
        <DataCell header>Method</DataCell>
        <DataCell header align="right">Amount (UGX)</DataCell>
      </DataHeader>
      {page.rows.map((row) => (
        <DataRow key={row.payment_id} density="compact" tabular>
          <DataCell>
            {new Intl.DateTimeFormat("en-UG", {
              timeZone: "Africa/Kampala",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(row.transaction_time))}
          </DataCell>
          <DataCell className="font-bold">ORD-{row.order_id}</DataCell>
          <DataCell>PAY-{row.payment_id}</DataCell>
          <DataCell>{row.table_id}</DataCell>
          <DataCell>{row.waiter}</DataCell>
          <DataCell>{row.cashier}</DataCell>
          <DataCell>{row.payment_method}</DataCell>
          <DataCell align="right">{formatUgx(row.amount)}</DataCell>
        </DataRow>
      ))}
      {!page.rows.length ? (
        <DataRow density="compact">
          <DataCell>No paid orders in this date range.</DataCell>
        </DataRow>
      ) : null}
    </DataTable>
  );
}

export function PaidOrderHistory({
  page,
  title = "Paid order history",
  compact = false,
  onPage,
  id,
}: {
  page: PaymentHistoryPage;
  title?: string;
  compact?: boolean;
  onPage?: (offset: number) => void;
  id?: string;
}) {
  const lastOffset = Math.max(0, Math.floor((page.total - 1) / page.limit) * page.limit);
  return (
    <Panel id={id} pad="lg" className="mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-panel font-normal">{title}</h2>
          <p className="m-0 text-label tracking-caption text-moss">
            {compact
              ? `Showing latest ${page.rows.length} of ${page.total} recorded payments`
              : `${page.total} recorded payments`}
          </p>
        </div>
      </div>
      <PaidOrderTable page={page} />
      {!compact && onPage ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            size="md"
            variant="tonal"
            disabled={page.offset === 0}
            onClick={() => onPage(Math.max(0, page.offset - page.limit))}
          >
            Previous
          </Button>
          <span className="text-label tabular-nums">
            {page.total ? page.offset + 1 : 0}–{Math.min(page.offset + page.limit, page.total)} of {page.total}
          </span>
          <Button
            size="md"
            variant="tonal"
            disabled={page.offset >= lastOffset}
            onClick={() => onPage(Math.min(lastOffset, page.offset + page.limit))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
