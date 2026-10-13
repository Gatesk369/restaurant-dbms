import { DataCell, DataHeader, DataRow, DataTable } from "~/components/ui/DataTable";
import { Panel, PanelHeading } from "~/components/ui/Panel";
import type { TableTurnoverRow, TopItemRow, WaiterRow } from "~/lib/api/types";
import type { Period, Summary } from "~/lib/domain/reports";
import { formatAmount, formatUgx } from "~/lib/money";

export function SummaryStrip({ summary, bestLabel }: { summary: Summary; bestLabel: string }) {
  const stats: { label: string; value: string; tabular: boolean }[] = [
    { label: "Revenue", value: formatUgx(summary.revenue), tabular: true },
    { label: "Orders", value: formatAmount(summary.orders), tabular: true },
    { label: "Average order", value: formatUgx(summary.average), tabular: true },
    { label: bestLabel, value: summary.best ?? "—", tabular: false },
  ];
  return (
    <section
      aria-label="Summary"
      className="box-border flex flex-wrap gap-x-12 gap-y-4 rounded-md border border-tea px-6 py-4"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5">
          <span className="text-label font-bold tracking-label text-moss">{stat.label}</span>
          <span
            className={stat.tabular ? "text-panel font-bold tabular-nums" : "text-panel font-bold"}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </section>
  );
}

export function TopItemsPanel({ rows }: { rows: readonly TopItemRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.units_sold));
  return (
    <Panel sizing="content" className="min-w-0 flex-[3_1_560px]">
      <PanelHeading
        title="Top-selling menu items"
        caption="Six best sellers by quantity, from ORDER_ITEMS."
      />
      <DataTable
        label="Top-selling menu items"
        columns="168px minmax(60px,1fr) 64px 120px"
        minWidth={520}
      >
        <DataHeader>
          <DataCell header>Item</DataCell>
          <DataCell header>Quantity sold</DataCell>
          <DataCell header align="right">
            Sold
          </DataCell>
          <DataCell header align="right">
            Revenue (UGX)
          </DataCell>
        </DataHeader>
        {rows.map((row) => (
          <DataRow key={row.menu_item_id} density="compact" tabular>
            <DataCell className="font-bold">{row.item_name}</DataCell>
            <DataCell>
              <div
                className="h-[14px] rounded-r-chip bg-moss"
                style={{ width: `${(row.units_sold / max) * 100}%` }}
              />
            </DataCell>
            <DataCell align="right">{formatAmount(row.units_sold)}</DataCell>
            <DataCell align="right">{formatAmount(row.revenue)}</DataCell>
          </DataRow>
        ))}
      </DataTable>
    </Panel>
  );
}

export function WaiterPanel({ rows }: { rows: readonly WaiterRow[] }) {
  return (
    <Panel sizing="content" className="min-w-0 flex-[2_1_400px]">
      <PanelHeading
        title="Waiter performance"
        caption="Orders taken and revenue per waiter, from ORDERS and STAFF."
      />
      <DataTable
        label="Waiter performance"
        columns="minmax(0,1.3fr) 64px 116px 116px"
        minWidth={420}
      >
        <DataHeader>
          <DataCell header>Waiter</DataCell>
          <DataCell header align="right">
            Orders
          </DataCell>
          <DataCell header align="right">
            Revenue
          </DataCell>
          <DataCell header align="right">
            Average
          </DataCell>
        </DataHeader>
        {rows.map((row) => (
          <DataRow key={row.staff_id} density="compact" tabular>
            <DataCell className="font-bold">{row.username}</DataCell>
            <DataCell align="right">{formatAmount(row.orders_handled)}</DataCell>
            <DataCell align="right">{formatAmount(row.revenue)}</DataCell>
            <DataCell align="right">{formatAmount(row.avg_order_value)}</DataCell>
          </DataRow>
        ))}
      </DataTable>
    </Panel>
  );
}

interface SalesPanelProps {
  title: string;
  periodHead: string;
  periods: readonly Period[];
  summary: Summary;
}

export function SalesPanel({ title, periodHead, periods, summary }: SalesPanelProps) {
  return (
    <Panel sizing="content" className="min-w-0 flex-[3_1_560px]">
      <PanelHeading title={title} caption="Orders and revenue per period, from SALES_RECORD." />
      <DataTable label="Sales by period" columns="minmax(0,1.3fr) 80px 128px 128px" minWidth={480}>
        <DataHeader>
          <DataCell header>{periodHead}</DataCell>
          <DataCell header align="right">
            Orders
          </DataCell>
          <DataCell header align="right">
            Revenue
          </DataCell>
          <DataCell header align="right">
            Average order
          </DataCell>
        </DataHeader>
        {periods.map((period) => (
          <DataRow key={period.label} density="compact" tabular>
            <DataCell className="font-bold">{period.label}</DataCell>
            <DataCell align="right">{formatAmount(period.orders)}</DataCell>
            <DataCell align="right">{formatAmount(period.revenue)}</DataCell>
            <DataCell align="right">
              {formatAmount(period.orders > 0 ? Math.round(period.revenue / period.orders) : 0)}
            </DataCell>
          </DataRow>
        ))}
        <DataRow density="compact" total tabular>
          <DataCell>Total</DataCell>
          <DataCell align="right">{formatAmount(summary.orders)}</DataCell>
          <DataCell align="right">{formatAmount(summary.revenue)}</DataCell>
          <DataCell align="right">{formatUgx(summary.average)}</DataCell>
        </DataRow>
      </DataTable>
    </Panel>
  );
}

export function TurnoverPanel({ rows }: { rows: readonly TableTurnoverRow[] }) {
  // Seats (gap G2) and average stay (gap G13) are shown once the API has them.
  const hasSeats = rows.some((r) => r.seats !== undefined);
  const hasStay = rows.some((r) => r.avg_stay_minutes !== undefined);
  const columns = [
    "64px",
    hasSeats ? "72px" : null,
    "minmax(0,1fr)",
    hasStay ? "minmax(0,1fr)" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Panel sizing="content" className="min-w-0 flex-[2_1_400px]">
      <PanelHeading
        title="Table turnover"
        caption="How many parties each table served per day, from TABLES and ORDERS."
      />
      <DataTable label="Table turnover" columns={columns} minWidth={420}>
        <DataHeader>
          <DataCell header>Table</DataCell>
          {hasSeats ? (
            <DataCell header align="right">
              Seats
            </DataCell>
          ) : null}
          <DataCell header align="right">
            Turns per day
          </DataCell>
          {hasStay ? (
            <DataCell header align="right">
              Average stay
            </DataCell>
          ) : null}
        </DataHeader>
        {rows.map((row) => (
          <DataRow key={row.table_id} density="dense" tabular>
            <DataCell className="font-bold">T{row.table_id}</DataCell>
            {hasSeats ? <DataCell align="right">{row.seats ?? "—"}</DataCell> : null}
            <DataCell align="right">{row.turnover_per_day.toFixed(1)}</DataCell>
            {hasStay ? (
              <DataCell align="right">
                {row.avg_stay_minutes === undefined ? "—" : `${row.avg_stay_minutes} min`}
              </DataCell>
            ) : null}
          </DataRow>
        ))}
      </DataTable>
    </Panel>
  );
}
