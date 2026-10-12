import { useState, type ReactNode } from "react";

import { ActivityLog } from "~/components/ui/ActivityLog";
import { Button, ButtonLink } from "~/components/ui/Button";
import { Chip, ToggleChip, ToggleGroup } from "~/components/ui/Chip";
import { DataCell, DataHeader, DataRow, DataTable } from "~/components/ui/DataTable";
import { Field, FieldError, Input, Select, Textarea } from "~/components/ui/Field";
import { ICON_NAMES, Icon } from "~/components/ui/Icon";
import { LockedTile } from "~/components/ui/LockedTile";
import { Panel, PanelHeading } from "~/components/ui/Panel";
import { QuantityStepper } from "~/components/ui/QuantityStepper";
import { RadioCard, RadioCardGroup } from "~/components/ui/RadioCard";
import { TableTile } from "~/components/ui/TableTile";
import { StationToast, StatusMessage } from "~/components/ui/Toast";

// No generated route types: this route only exists in styleguide builds.
export function meta() {
  return [{ title: "Primitives · Restaurant DBMS" }];
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`} className="m-0 text-panel font-normal">
        {title}
      </h2>
      {children}
    </section>
  );
}

// A reference sheet for the primitives in every state, used by the visual and
// token tests. Served only when the app is built with VITE_STYLEGUIDE=true.
export default function Styleguide() {
  const [method, setMethod] = useState("cash");
  const [category, setCategory] = useState("Mains");
  const [qty, setQty] = useState(2);

  return (
    <main className="mx-auto flex max-w-content flex-col gap-10 px-6 py-8">
      <h1 className="m-0 text-title font-normal">Primitives</h1>

      <Section id="buttons" title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="primary" disabled>
            Disabled primary
          </Button>
          <Button variant="tonal" disabled>
            Disabled tonal
          </Button>
          <Button variant="primary" pending>
            Pending
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button variant="tonal" size="sm">
            Small
          </Button>
          <Button variant="primary" size="touch">
            Touch
          </Button>
          <Button variant="tonal" size="touchSm">
            Touch small
          </Button>
          <Button variant="tonal" icon aria-label="Add one Rolex">
            <Icon name="add" size={18} />
          </Button>
          <Button variant="tonal">
            <Icon name="edit" size={18} />
            Edit
          </Button>
          <ButtonLink to="/payments" variant="primary">
            Take payment
          </ButtonLink>
        </div>
      </Section>

      <Section id="fields" title="Fields">
        <div className="grid grid-cols-3 gap-4 max-[880px]:grid-cols-1">
          <Field label="Username">
            <Input defaultValue="nakato.sarah" autoComplete="off" />
          </Field>
          <Field
            label="Password"
            error="Error: enter your username and a password of at least 4 characters."
          >
            <Input type="password" defaultValue="abc" />
          </Field>
          <Field label="Price (UGX)" hint="The database also checks this.">
            <Input inputMode="numeric" placeholder="For example: 18000" />
          </Field>
          <Field label="Category">
            <Select defaultValue="Mains">
              {["Mains", "Snacks", "Sides", "Drinks", "Desserts"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Special instructions" className="col-span-2 max-[880px]:col-span-1">
            <Textarea placeholder="For example: no onions, sauce on the side" />
          </Field>
          <Field label="Phone number (station)">
            <Input controlSize="touch" placeholder="07XX XXX XXX" />
          </Field>
        </div>
        <FieldError>Error: enter a 10-digit number that starts with 07.</FieldError>
      </Section>

      <Section id="chips" title="Chips and toggles">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Pending</Chip>
          <Chip tone="active">Preparing</Chip>
          <Chip tone="done">Served</Chip>
          <Chip tone="outline">Archived</Chip>
          <Chip tone="active">×2</Chip>
        </div>
        <ToggleGroup label="Category">
          {["All", "Mains", "Snacks", "Sides", "Drinks"].map((c) => (
            <ToggleChip key={c} pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </ToggleChip>
          ))}
        </ToggleGroup>
        <ToggleGroup label="Date range">
          <ToggleChip size="large" pressed>
            This week
          </ToggleChip>
          <ToggleChip size="large" pressed={false}>
            Last 4 weeks
          </ToggleChip>
        </ToggleGroup>
      </Section>

      <Section id="radio-cards" title="Radio cards">
        <RadioCardGroup legend="Payment method">
          <RadioCard
            name="method"
            value="cash"
            checked={method === "cash"}
            onChange={setMethod}
            label="Cash"
            hint="Count the notes and give change"
            variant="method"
          />
          <RadioCard
            name="method"
            value="momo"
            checked={method === "momo"}
            onChange={setMethod}
            label="Mobile money"
            hint="MTN or Airtel"
            variant="method"
          />
        </RadioCardGroup>
      </Section>

      <Section id="tables" title="Table tiles">
        <div className="grid max-w-md grid-cols-6 gap-2">
          <TableTile label="T1" sub="2 seats" state="free" ariaLabel="Table 1, 2 seats" />
          <TableTile label="T2" sub="Occupied" state="busy" ariaLabel="Table 2, occupied" />
          <TableTile label="T6" sub="4 seats" state="selected" ariaLabel="Table 6, 4 seats" />
        </div>
        <div className="grid max-w-md grid-cols-4 gap-3">
          <TableTile
            size="station"
            label="T7"
            sub="4 seats"
            state="free"
            ariaLabel="Table 7, 4 seats"
          />
          <TableTile
            size="station"
            label="T9"
            sub="In use"
            state="busy"
            ariaLabel="Table 9, in use"
          />
        </div>
      </Section>

      <Section id="panels" title="Panels, stepper, messages">
        <Panel>
          <PanelHeading
            title="Database activity"
            caption="Triggers that run when an order is placed."
          />
          <div className="flex items-center gap-4">
            <QuantityStepper
              value={qty}
              itemName="Rolex"
              onDecrement={() => setQty((n) => Math.max(0, n - 1))}
              onIncrement={() => setQty((n) => n + 1)}
            />
            <QuantityStepper
              value={1}
              itemName="Chapati"
              size="lg"
              onDecrement={() => {}}
              onIncrement={() => {}}
            />
          </div>
        </Panel>
        <StatusMessage>
          Order ORD-1048 placed for Table 6. The kitchen can see it as pending.
        </StatusMessage>
        <div className="relative h-16 rounded-md border border-tea">
          <StationToast>A waiter is on the way to Table 6.</StationToast>
        </div>
        <LockedTile title="Payments" roleLabel="Wait Staff" className="max-w-xs" />
      </Section>

      <Section id="data" title="Data table and log">
        <DataTable label="Menu items" columns="76px minmax(0,1.6fr) 100px 112px" minWidth={480}>
          <DataHeader>
            <DataCell header>ID</DataCell>
            <DataCell header>Item</DataCell>
            <DataCell header>Category</DataCell>
            <DataCell header align="right">
              Price (UGX)
            </DataCell>
          </DataHeader>
          <DataRow hoverable>
            <DataCell className="font-bold text-moss">MI-001</DataCell>
            <DataCell className="font-bold">Matoke &amp; Beef Stew</DataCell>
            <DataCell>Mains</DataCell>
            <DataCell align="right" className="tabular-nums">
              18,000
            </DataCell>
          </DataRow>
          <DataRow selected>
            <DataCell className="font-bold text-moss">MI-002</DataCell>
            <DataCell className="font-bold">Chicken Luwombo</DataCell>
            <DataCell>Mains</DataCell>
            <DataCell align="right" className="tabular-nums">
              25,000
            </DataCell>
          </DataRow>
        </DataTable>
        <ActivityLog
          description="Triggers that run when an order is placed or changes status."
          entries={[
            { time: "12:41", text: "TABLES: Table 9 free_status set to FALSE" },
            { time: "12:41", text: "ORDERS: ORD-1046 inserted with status pending" },
          ]}
        />
      </Section>

      <Section id="icons" title="Icons">
        <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
          {ICON_NAMES.map((name) => (
            <li
              key={name}
              className="flex w-24 flex-col items-center gap-1 text-label tracking-caption"
            >
              <Icon name={name} size={24} />
              {name}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
