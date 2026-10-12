import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Button, ButtonLink } from "~/components/ui/Button";
import { Chip, ToggleChip } from "~/components/ui/Chip";
import { DataCell, DataHeader, DataRow, DataTable } from "~/components/ui/DataTable";
import { Field, Input, Select, Textarea } from "~/components/ui/Field";
import { ICON_NAMES, Icon } from "~/components/ui/Icon";
import { QuantityStepper } from "~/components/ui/QuantityStepper";
import { RadioCard, RadioCardGroup } from "~/components/ui/RadioCard";
import { TableTile } from "~/components/ui/TableTile";
import { ActivityLog } from "~/components/ui/ActivityLog";
import { LockedTile } from "~/components/ui/LockedTile";

function inRouter(element: React.ReactElement) {
  const router = createMemoryRouter([{ path: "/", element }]);
  return render(<RouterProvider router={router} />);
}

describe("Button", () => {
  it("calls onClick and defaults to type=button", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save item</Button>);
    const button = screen.getByRole("button", { name: "Save item" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does nothing when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Place order
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is disabled and busy while a request is pending", () => {
    render(<Button pending>Record payment</Button>);
    const button = screen.getByRole("button", { name: "Record payment" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders navigation as a link", () => {
    inRouter(<ButtonLink to="/payments">Take payment</ButtonLink>);
    expect(screen.getByRole("link", { name: "Take payment" })).toHaveAttribute("href", "/payments");
  });
});

describe("Field controls", () => {
  it("associates the label and exposes the error to assistive technology", () => {
    render(
      <Field label="Item name" error="Error: enter a name for the item.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Item name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Error: enter a name for the item.");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("is valid and undescribed without an error", () => {
    render(
      <Field label="Username">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Username");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("describes the control with its hint", () => {
    render(
      <Field label="Price (UGX)" hint="The database also checks this.">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Price (UGX)")).toHaveAccessibleDescription(
      "The database also checks this.",
    );
  });

  it("works for select and textarea and can hide the label visually", () => {
    render(
      <>
        <Field label="Category">
          <Select defaultValue="Drinks">
            <option>Mains</option>
            <option>Drinks</option>
          </Select>
        </Field>
        <Field label="Search menu items" hideLabel>
          <Input />
        </Field>
        <Field label="Notes">
          <Textarea />
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Category")).toHaveValue("Drinks");
    expect(screen.getByLabelText("Search menu items")).toBeInTheDocument();
    expect(screen.getByText("Search menu items")).toHaveClass("sr-only");
    expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
  });
});

describe("toggles and cards", () => {
  it("exposes the pressed state", async () => {
    const onClick = vi.fn();
    render(
      <>
        <ToggleChip pressed onClick={onClick}>
          Mains
        </ToggleChip>
        <ToggleChip pressed={false}>Snacks</ToggleChip>
      </>,
    );
    expect(screen.getByRole("button", { name: "Mains" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Snacks" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: "Mains" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("behaves as a native radio group", async () => {
    const onChange = vi.fn();
    render(
      <RadioCardGroup legend="Payment method">
        <RadioCard
          name="method"
          value="cash"
          checked
          onChange={onChange}
          label="Cash"
          hint="Count the notes and give change"
        />
        <RadioCard
          name="method"
          value="momo"
          checked={false}
          onChange={onChange}
          label="Mobile money"
          hint="MTN or Airtel"
        />
      </RadioCardGroup>,
    );
    const group = screen.getByRole("group", { name: "Payment method" });
    const cash = within(group).getByRole("radio", { name: /Cash/ });
    const momo = within(group).getByRole("radio", { name: /Mobile money/ });
    expect(cash).toBeChecked();
    expect(momo).not.toBeChecked();
    await userEvent.click(momo);
    expect(onChange).toHaveBeenCalledWith("momo");
  });

  it("marks busy tables disabled and selected tables pressed", async () => {
    const onSelect = vi.fn();
    render(
      <>
        <TableTile
          label="T2"
          sub="Occupied"
          state="busy"
          ariaLabel="Table 2, occupied"
          onSelect={onSelect}
        />
        <TableTile
          label="T6"
          sub="4 seats"
          state="selected"
          ariaLabel="Table 6, 4 seats"
          onSelect={onSelect}
        />
        <TableTile
          label="T1"
          sub="2 seats"
          state="free"
          ariaLabel="Table 1, 2 seats"
          onSelect={onSelect}
        />
      </>,
    );
    expect(screen.getByRole("button", { name: "Table 2, occupied" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Table 6, 4 seats" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Table 2, occupied" }));
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Table 1, 2 seats" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe("QuantityStepper", () => {
  it("speaks the item name and reports each step", async () => {
    const dec = vi.fn();
    const inc = vi.fn();
    render(<QuantityStepper value={2} itemName="Rolex" onDecrement={dec} onIncrement={inc} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove one Rolex" }));
    await userEvent.click(screen.getByRole("button", { name: "Add one Rolex" }));
    expect(dec).toHaveBeenCalledOnce();
    expect(inc).toHaveBeenCalledOnce();
  });
});

describe("DataTable", () => {
  it("exposes table, header and cell roles", () => {
    render(
      <DataTable label="Menu items" columns="76px 1fr">
        <DataHeader>
          <DataCell header>ID</DataCell>
          <DataCell header>Item</DataCell>
        </DataHeader>
        <DataRow>
          <DataCell>MI-001</DataCell>
          <DataCell>Matoke &amp; Beef Stew</DataCell>
        </DataRow>
      </DataTable>,
    );
    const table = screen.getByRole("table", { name: "Menu items" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["ID", "Item"]);
    expect(within(table).getByRole("cell", { name: "MI-001" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")[0]).toHaveStyle({ gridTemplateColumns: "76px 1fr" });
  });
});

describe("static primitives", () => {
  it("prints the status word in a chip", () => {
    render(<Chip tone="done">Served</Chip>);
    expect(screen.getByText("Served")).toBeInTheDocument();
  });

  it("lists activity newest first as given", () => {
    render(
      <ActivityLog
        description="Triggers."
        entries={[
          { time: "12:42", text: "ORDERS: ORD-1047 inserted with status pending" },
          { time: "12:41", text: "TABLES: Table 9 free_status set to FALSE" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("ORD-1047");
    expect(screen.getByRole("heading", { name: "Database activity" })).toBeInTheDocument();
  });

  it("states which role a screen is locked for", () => {
    render(<LockedTile title="Payments" roleLabel="Wait Staff" />);
    expect(screen.getByText("Locked for Wait Staff")).toBeInTheDocument();
  });

  it("hides icons from assistive technology", () => {
    const { container } = render(<Icon name="add" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(ICON_NAMES).toContain("signOut");
  });
});
