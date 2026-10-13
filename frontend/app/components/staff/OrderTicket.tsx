import { Button } from "~/components/ui/Button";
import { Field, FieldError, Select, Textarea } from "~/components/ui/Field";
import { Panel } from "~/components/ui/Panel";
import { QuantityStepper } from "~/components/ui/QuantityStepper";
import { formatUgx } from "~/lib/money";

export interface TicketLine {
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface OrderTicketProps {
  /** "Table 6" or "Not chosen". */
  tableText: string;
  waiterName: string;
  customers: { value: string; label: string }[];
  customer: string;
  onCustomer: (value: string) => void;
  lines: TicketLine[];
  onIncrement: (menuItemId: number) => void;
  onDecrement: (menuItemId: number) => void;
  notes: string;
  onNotes: (value: string) => void;
  total: number;
  /** Why Place order is disabled, or null when it is ready. */
  missing: string | null;
  placing: boolean;
  error: string | null;
  onPlace: () => void;
}

/** The "New order" ticket: table, waiter, customer, items, notes, total. */
export function OrderTicket({
  tableText,
  waiterName,
  customers,
  customer,
  onCustomer,
  lines,
  onIncrement,
  onDecrement,
  notes,
  onNotes,
  total,
  missing,
  placing,
  error,
  onPlace,
}: OrderTicketProps) {
  return (
    <Panel gap="md">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-panel font-normal">New order</h2>
        {/* The id is assigned by the database, so it is not predicted here. */}
        <span className="text-body font-bold text-moss">Draft</span>
      </div>

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body tracking-body">
        <dt className="text-moss">Table</dt>
        <dd className="m-0 font-bold">{tableText}</dd>
        <dt className="text-moss">Waiter</dt>
        <dd className="m-0 font-bold">{waiterName}</dd>
      </dl>

      <Field label="Customer">
        <Select value={customer} onChange={(e) => onCustomer(e.target.value)}>
          {customers.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-body font-bold tracking-bold">Items</h3>
        {lines.length === 0 ? (
          <p className="m-0 rounded-md bg-tea p-4 text-body tracking-body">
            No items yet. Pick dishes and drinks from the menu.
          </p>
        ) : null}
        {lines.map((line) => (
          <div key={line.menuItemId} className="flex items-center gap-3 border-b border-tea py-2">
            <div className="min-w-0 flex-auto">
              <div className="text-body font-bold tracking-bold">{line.name}</div>
              <div className="text-label tracking-caption text-moss">
                {line.quantity} × {formatUgx(line.unitPrice)}
              </div>
            </div>
            <QuantityStepper
              value={line.quantity}
              itemName={line.name}
              onDecrement={() => onDecrement(line.menuItemId)}
              onIncrement={() => onIncrement(line.menuItemId)}
            />
            <div className="min-w-[84px] flex-none text-right text-body font-bold tabular-nums">
              {formatUgx(line.quantity * line.unitPrice)}
            </div>
          </div>
        ))}
      </div>

      <Field label="Special instructions">
        <Textarea
          className="resize-y"
          placeholder="For example: no onions, sauce on the side"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
        />
      </Field>

      <div className="flex items-baseline justify-between gap-3 border-t border-moss pt-2">
        <span className="text-heading font-bold">Order total</span>
        <span className="text-panel font-bold tabular-nums">{formatUgx(total)}</span>
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={missing !== null}
        pending={placing}
        onClick={onPlace}
      >
        Place order
      </Button>
      {missing ? <p className="m-0 text-label tracking-caption text-moss">{missing}</p> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Panel>
  );
}
