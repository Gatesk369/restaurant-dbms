import { Button } from "~/components/ui/Button";
import { Field, FieldError, Textarea } from "~/components/ui/Field";
import { QuantityStepper } from "~/components/ui/QuantityStepper";
import { formatUgx } from "~/lib/money";
import type { CartView } from "./MenuStep";

interface ReviewStepProps {
  orderFor: string;
  cart: readonly CartView[];
  total: number;
  onIncrement: (menuItemId: number) => void;
  onDecrement: (menuItemId: number) => void;

  notes: string;
  onNotes: (value: string) => void;

  sending: boolean;
  /** Why the order could not be sent (server side). */
  error: string | null;
  onBack: () => void;
  onSend: () => void;
}

/** Step 3: lines, kitchen note, and the send button. */
export function ReviewStep({
  orderFor,
  cart,
  total,
  onIncrement,
  onDecrement,
  notes,
  onNotes,
  sending,
  error,
  onBack,
  onSend,
}: ReviewStepProps) {
  return (
    <div className="station-step station-review box-border flex flex-1 flex-col gap-4 p-6">
      <fieldset disabled={sending} className="contents">
        <div className="station-review-columns flex flex-auto gap-6">
          <section className="box-border flex min-w-0 flex-[1.2_1_0] flex-col gap-3 rounded-md border border-tea p-6">
            <div>
              <h2 className="m-0 text-title font-normal">Check your order</h2>
              <p className="m-0 text-body tracking-body text-moss">{orderFor}</p>
            </div>
            <div className="flex-auto">
              {cart.map((line) => (
                <div
                  key={line.menuItemId}
                  className="flex flex-wrap items-center gap-4 border-b border-tea py-[10px]"
                >
                  <div className="min-w-0 flex-auto">
                    <div className="text-heading font-bold tracking-heading">{line.name}</div>
                    <div className="text-label tracking-caption text-moss">
                      {line.quantity} × {formatUgx(line.unitPrice)}
                    </div>
                  </div>
                  <QuantityStepper
                    size="lg"
                    value={line.quantity}
                    itemName={line.name}
                    onDecrement={() => onDecrement(line.menuItemId)}
                    onIncrement={() => onIncrement(line.menuItemId)}
                  />
                  <div className="min-w-[104px] flex-none text-right text-heading font-bold tabular-nums">
                    {formatUgx(line.quantity * line.unitPrice)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-moss pt-2">
              <span className="text-heading font-bold">Total</span>
              <span className="text-title font-bold tabular-nums">{formatUgx(total)}</span>
            </div>
          </section>

          <section className="box-border flex min-w-0 flex-[1_1_0] flex-col gap-4">
            <Field label="Special instructions for the kitchen">
              <Textarea
                controlSize="touch"
                className="resize-none"
                placeholder="For example: no onions, sauce on the side"
                value={notes}
                onChange={(e) => onNotes(e.target.value)}
              />
            </Field>
          </section>
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="station-actions flex flex-none flex-wrap items-center justify-between gap-4">
          <Button variant="tonal" size="touch" onClick={onBack}>
            Back to menu
          </Button>
          <Button
            size="touch"
            className="w-full sm:w-auto sm:min-w-[320px]"
            pending={sending}
            pendingLabel="Sending order…"
            onClick={onSend}
          >
            Send to kitchen · {formatUgx(total)}
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
