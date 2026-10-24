import { Button } from "~/components/ui/Button";
import { Chip } from "~/components/ui/Chip";
import { DataCell, DataHeader, DataRow, DataTable } from "~/components/ui/DataTable";
import { Field, FieldError, Input, Select } from "~/components/ui/Field";
import { Panel } from "~/components/ui/Panel";
import { RadioCard, RadioCardGroup } from "~/components/ui/RadioCard";
import type { Order } from "~/lib/api/types";
import { MOBILE_NETWORKS, type Method, type MobileNetwork } from "~/lib/domain/payments";
import { formatUgx } from "~/lib/money";
import { PHONE_ERROR, quickAmounts } from "~/lib/validation";

interface CheckoutPanelProps {
  order: Order;
  /** Signed-in cashier, for "Recorded by". */
  staffName: string;
  roleLabel: string;
  /** Only cashiers see payment-entry controls; managers get the order summary. */
  canRecord: boolean;

  method: Method;
  onMethod: (method: Method) => void;

  tendered: string;
  onTendered: (digits: string) => void;
  changeDue: number;
  /** Set after a failed attempt: the "short of the total" message. */
  cashError: string | null;

  network: MobileNetwork;
  onNetwork: (network: MobileNetwork) => void;
  phone: string;
  onPhone: (value: string) => void;
  phoneInvalid: boolean;

  paying: boolean;
  /** Server-side failure (already paid, not served, no permission). */
  error: string | null;
  onRecord: () => void;
}

const COLUMNS = "minmax(0,1fr) 56px 104px 112px";

/** The checkout: lines, total, method, cash or mobile-money fields, record. */
export function CheckoutPanel({
  order,
  staffName,
  roleLabel,
  canRecord,
  method,
  onMethod,
  tendered,
  onTendered,
  changeDue,
  cashError,
  network,
  onNetwork,
  phone,
  onPhone,
  phoneInvalid,
  paying,
  error,
  onRecord,
}: CheckoutPanelProps) {
  const meta = [
    order.customer_name || "Walk-in guest",
    order.waiter ? `served by ${order.waiter}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Panel pad="lg" gap="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-panel font-normal">
            ORD-{order.order_id} · Table {order.table_id}
          </h2>
          <p className="mt-1 mb-0 text-body tracking-body text-moss">{meta}</p>
        </div>
        <Chip tone="done">Served</Chip>
      </div>

      <DataTable label="Order items" columns={COLUMNS}>
        <DataHeader>
          <DataCell header>Item</DataCell>
          <DataCell header align="right">
            Qty
          </DataCell>
          <DataCell header align="right">
            Price
          </DataCell>
          <DataCell header align="right">
            Subtotal
          </DataCell>
        </DataHeader>
        {order.items.map((item) => (
          <DataRow key={item.order_item_id} density="snug" tabular>
            <DataCell>{item.item_name}</DataCell>
            <DataCell align="right">{item.quantity}</DataCell>
            <DataCell align="right">{formatUgx(item.unit_price)}</DataCell>
            <DataCell align="right" className="font-bold">
              {formatUgx(item.item_subtotal)}
            </DataCell>
          </DataRow>
        ))}
      </DataTable>

      <div className="flex items-baseline justify-between gap-3 border-t border-moss pt-2">
        <span className="text-heading font-bold">Total due</span>
        <span className="text-title font-bold tabular-nums">{formatUgx(order.total)}</span>
      </div>

      {canRecord ? (
        <>
          <RadioCardGroup legend="Payment method">
            <RadioCard
              name="method"
              value="cash"
              checked={method === "cash"}
              onChange={() => onMethod("cash")}
              label="Cash"
              hint="Count the notes and give change"
              variant="method"
            />
            <RadioCard
              name="method"
              value="momo"
              checked={method === "momo"}
              onChange={() => onMethod("momo")}
              label="Mobile money"
              hint="MTN or Airtel"
              variant="method"
            />
          </RadioCardGroup>

          {method === "cash" ? (
            <div className="flex flex-col gap-3">
              <Field label="Amount received (UGX)">
                <Input
                  inputMode="numeric"
                  placeholder="For example: 100000"
                  value={tendered}
                  aria-invalid={cashError ? true : undefined}
                  aria-describedby={cashError ? "cash-error" : undefined}
                  onChange={(e) => onTendered(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                {quickAmounts(order.total).map((quick) => (
                  <Button
                    key={quick.label}
                    variant="tonal"
                    size="sm"
                    onClick={() => onTendered(String(quick.value))}
                  >
                    {quick.label}
                  </Button>
                ))}
              </div>
              {cashError ? <FieldError id="cash-error">{cashError}</FieldError> : null}
              <div className="flex items-baseline justify-between gap-3 rounded-md bg-tea px-4 py-3">
                <span className="text-body font-bold">Change due</span>
                <span className="text-figure font-bold tabular-nums">{formatUgx(changeDue)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-4">
                <Field label="Network" className="flex-[1_1_220px]">
                  <Select
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
                <Field label="Customer phone number" className="flex-[1_1_220px]">
                  <Input
                    inputMode="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    aria-invalid={phoneInvalid ? true : undefined}
                    aria-describedby={phoneInvalid ? "phone-error" : undefined}
                    onChange={(e) => onPhone(e.target.value)}
                  />
                </Field>
              </div>
              {phoneInvalid ? <FieldError id="phone-error">{PHONE_ERROR}</FieldError> : null}
              <p className="m-0 rounded-md bg-tea px-4 py-3 text-body tracking-body">
                The customer approves the request on their phone. Record the payment once the
                confirmation message arrives.
              </p>
            </div>
          )}

          {error ? <FieldError>{error}</FieldError> : null}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-tea pt-4">
            <p className="m-0 text-body tracking-body text-moss">
              Recorded by <strong className="text-forest">{staffName}</strong>, {roleLabel}
            </p>
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="primary"
                className="min-h-12 min-w-[220px]"
                pending={paying}
                onClick={onRecord}
              >
                Record payment · {formatUgx(order.total)}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </Panel>
  );
}
