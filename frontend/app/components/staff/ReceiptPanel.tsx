import { ButtonLink, Button } from "~/components/ui/Button";
import { Icon } from "~/components/ui/Icon";
import { Panel } from "~/components/ui/Panel";
import { formatUgx } from "~/lib/money";

export interface Receipt {
  paymentNumber: string;
  orderNumber: string;
  table: string;
  method: string;
  amount: number;
  change: number;
}

interface ReceiptPanelProps {
  receipt: Receipt;
  cashier: string;
  roleLabel: string;
  /** More served orders are waiting: offer "Next order". */
  moreWaiting: boolean;
  onNext: () => void;
}

/** What was recorded, with the way out: next order, orders, or the report. */
export function ReceiptPanel({
  receipt,
  cashier,
  roleLabel,
  moreWaiting,
  onNext,
}: ReceiptPanelProps) {
  return (
    <Panel pad="lg" gap="lg">
      <div role="status" className="flex items-center gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-moss text-white">
          <Icon name="check" size={24} />
        </span>
        <div>
          <h2 className="m-0 text-panel font-normal">Payment recorded</h2>
          <p className="m-0 text-body tracking-body text-moss">
            {receipt.paymentNumber} for {receipt.orderNumber}
          </p>
        </div>
      </div>

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body tracking-body">
        <dt className="text-moss">Table</dt>
        <dd className="m-0 font-bold">{receipt.table} is free again</dd>
        <dt className="text-moss">Method</dt>
        <dd className="m-0 font-bold">{receipt.method}</dd>
        <dt className="text-moss">Amount</dt>
        <dd className="m-0 font-bold tabular-nums">{formatUgx(receipt.amount)}</dd>
        <dt className="text-moss">Change given</dt>
        <dd className="m-0 font-bold tabular-nums">{formatUgx(receipt.change)}</dd>
        <dt className="text-moss">Recorded by</dt>
        <dd className="m-0 font-bold">
          {cashier}, {roleLabel}
        </dd>
      </dl>

      <div className="flex flex-wrap gap-3">
        {moreWaiting ? (
          <Button className="min-h-12" onClick={onNext}>
            Next order
          </Button>
        ) : (
          <ButtonLink to="/orders" className="min-h-12">
            Back to orders
          </ButtonLink>
        )}
        <ButtonLink to="/reports" variant="tonal" className="min-h-12">
          See sales report
        </ButtonLink>
      </div>
    </Panel>
  );
}
