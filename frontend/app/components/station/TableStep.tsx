import { Button } from "~/components/ui/Button";
import { Field, FieldError, Input } from "~/components/ui/Field";
import { TableTile } from "~/components/ui/TableTile";
import type { Table } from "~/lib/api/types";
import { tableAriaLabel, tableLabel, tableSub } from "~/lib/domain/tables";

interface TableStepProps {
  tables: readonly Table[];
  table: number | null;
  onPick: (tableId: number) => void;
  guestName: string;
  onGuestName: (value: string) => void;
  starting: boolean;
  error: string | null;
  onStart: () => void;
}

/** Step 1: an optional name and the 4 x 3 table grid. */
export function TableStep({
  tables,
  table,
  onPick,
  guestName,
  onGuestName,
  starting,
  error,
  onStart,
}: TableStepProps) {
  return (
    <div className="box-border flex h-[728px] items-center gap-16 px-12 py-8">
      <div className="flex min-w-0 flex-[0_0_440px] flex-col gap-6">
        <div>
          <h1 className="m-0 text-hero font-normal">Order from your table</h1>
          <p className="mt-2 mb-0 text-heading tracking-lede text-moss">
            Pick your table, choose your food and send it to the kitchen. A waiter brings it to you.
          </p>
        </div>

        <Field label="Your name (optional)">
          <Input
            controlSize="touch"
            autoComplete="off"
            placeholder="So the waiter knows who to look for"
            value={guestName}
            onChange={(e) => onGuestName(e.target.value)}
          />
        </Field>

        <Button
          size="touch"
          className="w-full"
          disabled={table === null}
          pending={starting}
          onClick={onStart}
        >
          Start order
        </Button>
        <p className="m-0 text-label tracking-caption text-moss">
          {table ? `Table ${table} selected.` : "Choose a table to continue."}
        </p>
        {error ? <FieldError>{error}</FieldError> : null}
      </div>

      <div className="flex min-w-0 flex-auto flex-col gap-3">
        <h2 className="m-0 text-panel font-normal">Choose your table</h2>
        <div className="grid grid-cols-4 gap-3">
          {tables.map((t) => (
            <TableTile
              key={t.table_id}
              size="station"
              label={tableLabel(t)}
              sub={tableSub(t, "In use")}
              ariaLabel={tableAriaLabel(t, "in use")}
              state={!t.free_status ? "busy" : table === t.table_id ? "selected" : "free"}
              onSelect={() => onPick(t.table_id)}
            />
          ))}
        </div>
        <p className="m-0 text-label tracking-caption text-moss">
          Tables marked In use already have an order open.
        </p>
      </div>
    </div>
  );
}
