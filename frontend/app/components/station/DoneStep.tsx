import { Button } from "~/components/ui/Button";
import { Icon } from "~/components/ui/Icon";
import { TRACKER } from "~/lib/domain/station";
import { formatUgx } from "~/lib/money";

export interface Summary {
  text: string;
  subtotal: number;
}

interface DoneStepProps {
  /** "ORD-1047". */
  orderNo: string;
  /** "Table 6". */
  tableLabel: string;
  /** Row of the tracker that is current, 0 to 2. */
  step: number;
  /** The kitchen cancelled it: the tracker is replaced by a note. */
  cancelled: boolean;
  summary: readonly Summary[];
  kitchenNote: string;
  total: number;
  /** Reviewer control that moves the tracker along (D13). */
  canAdvance: boolean;
  atEnd: boolean;
  onAdvance: () => void;
  onReset: () => void;
}

/** Step 4: confirmation, the three-row tracker, cashier instructions and the summary. */
export function DoneStep({
  orderNo,
  tableLabel,
  step,
  cancelled,
  summary,
  kitchenNote,
  total,
  canAdvance,
  atEnd,
  onAdvance,
  onReset,
}: DoneStepProps) {
  return (
    <div className="station-step station-done box-border flex flex-1 gap-12 px-12 py-8">
      <div className="flex min-w-0 flex-[1.2_1_0] flex-col gap-6">
        <div role="status" className="flex items-center gap-4">
          <span className="inline-flex size-14 flex-none items-center justify-center rounded-full bg-moss text-white">
            <Icon name="check" size={28} />
          </span>
          <div>
            <h1 className="m-0 text-hero font-normal">Order sent to the kitchen</h1>
            <p className="m-0 text-heading tracking-lede text-moss">
              {orderNo} · {tableLabel}
            </p>
          </div>
        </div>

        {cancelled ? (
          <p
            role="status"
            className="m-0 rounded-md bg-tea px-4 py-3 text-body font-bold tracking-body"
          >
            This order was cancelled. Please speak to a waiter.
          </p>
        ) : (
          <ol
            aria-live="polite"
            aria-atomic="true"
            aria-label="Order status"
            className="m-0 flex list-none flex-col gap-2 p-0"
          >
            {TRACKER.map((row, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li
                  key={row.label}
                  aria-current={current ? "step" : undefined}
                  className={
                    "box-border flex min-h-18 items-center gap-4 rounded-md px-4 py-2 " +
                    (current
                      ? "bg-moss text-white"
                      : done
                        ? "bg-forest text-white"
                        : "bg-tea text-forest")
                  }
                >
                  <span className="box-content inline-flex size-8 flex-none items-center justify-center rounded-full border-2 border-current text-body font-bold">
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="text-heading font-bold tracking-heading">{row.label}</span>
                    <span className="text-label tracking-caption">{row.hint}</span>
                  </span>
                  <span
                    className={
                      "box-border inline-flex min-h-6 items-center rounded-chip px-2 text-label leading-[inherit] font-bold tracking-label text-forest " +
                      (current || done ? "bg-white" : "bg-page")
                    }
                  >
                    {current ? "Now" : done ? "Done" : "Next"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <p className="m-0 rounded-md bg-tea px-4 py-3 text-body tracking-body">
          When you are ready to pay, ask your waiter for the payment options. Quote {orderNo} to the
          cashier, who will record your payment.
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-3">
          <Button size="touch" onClick={onReset}>
            Start a new order
          </Button>
          {canAdvance ? (
            <Button variant="tonal" size="touchSm" disabled={atEnd} onClick={onAdvance}>
              Prototype only: move the order along
            </Button>
          ) : null}
        </div>
      </div>

      <section className="box-border flex min-w-0 flex-[1_1_0] flex-col gap-3 rounded-md border border-tea p-6">
        <h2 className="m-0 text-panel font-normal">Your order</h2>
        <div className="flex-auto">
          {summary.map((line) => (
            <div
              key={line.text}
              className="flex items-baseline justify-between gap-3 border-b border-tea py-2 text-body tracking-body"
            >
              <span className="min-w-0">{line.text}</span>
              <span className="flex-none font-bold tabular-nums">{formatUgx(line.subtotal)}</span>
            </div>
          ))}
          {kitchenNote ? (
            <p className="mt-3 mb-0 text-label tracking-caption text-moss">
              Kitchen note: {kitchenNote}
            </p>
          ) : null}
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-moss pt-2">
          <span className="text-heading font-bold">Total</span>
          <span className="text-panel font-bold tabular-nums">{formatUgx(total)}</span>
        </div>
      </section>
    </div>
  );
}
