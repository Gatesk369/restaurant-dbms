import { Button } from "~/components/ui/Button";
import { Field, FieldError, Input, Select, Textarea } from "~/components/ui/Field";
import { QuantityStepper } from "~/components/ui/QuantityStepper";
import { RadioCard, RadioCardGroup } from "~/components/ui/RadioCard";
import { MOBILE_NETWORKS, type MobileNetwork } from "~/lib/domain/payments";
import type { PayChoice } from "~/lib/domain/station";
import { formatUgx } from "~/lib/money";
import { PHONE_ERROR } from "~/lib/validation";
import type { CartView } from "./MenuStep";

interface ReviewStepProps {
  orderFor: string;
  cart: readonly CartView[];
  total: number;
  onIncrement: (menuItemId: number) => void;
  onDecrement: (menuItemId: number) => void;

  notes: string;
  onNotes: (value: string) => void;

  pay: PayChoice;
  onPay: (choice: PayChoice) => void;
  network: MobileNetwork;
  onNetwork: (network: MobileNetwork) => void;
  phone: string;
  onPhone: (value: string) => void;
  phoneInvalid: boolean;

  sending: boolean;
  /** Why the order could not be sent (server side). */
  error: string | null;
  onBack: () => void;
  onSend: () => void;
}

/** Step 3: lines, kitchen note, how to pay, and the send button. */
export function ReviewStep({
  orderFor,
  cart,
  total,
  onIncrement,
  onDecrement,
  notes,
  onNotes,
  pay,
  onPay,
  network,
  onNetwork,
  phone,
  onPhone,
  phoneInvalid,
  sending,
  error,
  onBack,
  onSend,
}: ReviewStepProps) {
  return (
    <div className="box-border flex h-[728px] flex-col gap-4 p-6">
      <div className="flex min-h-0 flex-auto gap-6">
        <section className="box-border flex min-w-0 flex-[1.2_1_0] flex-col gap-3 rounded-md border border-tea p-6">
          <div>
            <h2 className="m-0 text-title font-normal">Check your order</h2>
            <p className="m-0 text-body tracking-body text-moss">{orderFor}</p>
          </div>
          <div className="min-h-0 flex-auto overflow-y-auto">
            {cart.map((line) => (
              <div
                key={line.menuItemId}
                className="flex items-center gap-4 border-b border-tea py-[10px]"
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

        <section className="box-border flex min-w-0 flex-[1_1_0] flex-col gap-4 overflow-y-auto pr-1">
          <Field label="Special instructions for the kitchen">
            <Textarea
              controlSize="touch"
              className="resize-none"
              placeholder="For example: no onions, sauce on the side"
              value={notes}
              onChange={(e) => onNotes(e.target.value)}
            />
          </Field>

          <RadioCardGroup legend="How will you pay?">
            <RadioCard
              name="pay"
              value="till"
              checked={pay === "till"}
              onChange={() => onPay("till")}
              label="At the till"
              hint="Cash or mobile money with the cashier"
              variant="touch"
            />
            <RadioCard
              name="pay"
              value="momo"
              checked={pay === "momo"}
              onChange={() => onPay("momo")}
              label="Mobile money now"
              hint="MTN or Airtel, from your phone"
              variant="touch"
            />
          </RadioCardGroup>

          {pay === "momo" ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Field label="Network" className="flex-[1_1_0]">
                  <Select
                    controlSize="touch"
                    value={network}
                    onChange={(e) => onNetwork(e.target.value as MobileNetwork)}
                  >
                    {MOBILE_NETWORKS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Phone number" className="flex-[1_1_0]">
                  <Input
                    controlSize="touch"
                    inputMode="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    aria-invalid={phoneInvalid ? true : undefined}
                    aria-describedby={phoneInvalid ? "station-phone-error" : undefined}
                    onChange={(e) => onPhone(e.target.value)}
                  />
                </Field>
              </div>
              {phoneInvalid ? (
                <FieldError id="station-phone-error">{PHONE_ERROR}</FieldError>
              ) : null}
            </div>
          ) : (
            <p className="m-0 rounded-md bg-tea px-4 py-3 text-body tracking-body">
              Pay the cashier with cash or mobile money when you are ready to leave. Quote your
              order number.
            </p>
          )}
        </section>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <div className="flex flex-none items-center justify-between gap-4">
        <Button variant="tonal" size="touch" onClick={onBack}>
          Back to menu
        </Button>
        <Button size="touch" className="min-w-[320px]" pending={sending} onClick={onSend}>
          Send to kitchen · {formatUgx(total)}
        </Button>
      </div>
    </div>
  );
}
