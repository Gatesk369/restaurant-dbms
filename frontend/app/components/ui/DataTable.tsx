import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

import { cx } from "~/lib/cx";

const ColumnsContext = createContext<string>("1fr");

interface DataTableProps {
  /** Accessible name, e.g. "Active orders". */
  label: string;
  /** CSS `grid-template-columns` shared by the header and every row. */
  columns: string;
  /** Inner width below which the table scrolls sideways instead of squeezing. */
  minWidth?: number;
  children: ReactNode;
}

/**
 * Records as an ARIA table built from grid rows, as specified in the design
 * document. Narrow screens scroll the table, never the page.
 */
export function DataTable({ label, columns, minWidth, children }: DataTableProps) {
  const style: CSSProperties | undefined = minWidth ? { minWidth } : undefined;
  return (
    <div className="overflow-x-auto">
      <div role="table" aria-label={label} style={style} className="flex flex-col">
        <ColumnsContext.Provider value={columns}>{children}</ColumnsContext.Provider>
      </div>
    </div>
  );
}

const ROW_BASE = "grid items-center gap-3 px-3";

export function DataHeader({ children }: { children: ReactNode }) {
  const columns = useContext(ColumnsContext);
  return (
    <div
      role="row"
      style={{ gridTemplateColumns: columns }}
      className={cx(ROW_BASE, "rounded-md bg-tea py-2 text-body font-bold tracking-bold")}
    >
      {children}
    </div>
  );
}

/** regular 60 (orders, menu) · compact 48 (reports) · dense 44 (turnover). */
export type RowDensity = "regular" | "compact" | "dense";

const DENSITY: Record<RowDensity, string> = {
  regular: "min-h-15 py-2",
  compact: "min-h-12 py-2",
  dense: "min-h-11 py-1.5",
};

interface DataRowProps {
  density?: RowDensity;
  /** Row is being edited: tea fill. */
  selected?: boolean;
  /** Hover tint, used by the orders and menu lists. */
  hoverable?: boolean;
  /** Bold last row with no divider ("Total"). */
  total?: boolean;
  children: ReactNode;
}

export function DataRow({
  density = "regular",
  selected = false,
  hoverable = false,
  total = false,
  children,
}: DataRowProps) {
  const columns = useContext(ColumnsContext);
  return (
    <div
      role="row"
      style={{ gridTemplateColumns: columns }}
      className={cx(
        ROW_BASE,
        "box-border text-body tracking-body",
        DENSITY[density],
        total ? "font-bold" : "border-b border-tea",
        selected ? "bg-tea" : hoverable && "hover:bg-row-hover",
      )}
    >
      {children}
    </div>
  );
}

interface DataCellProps {
  /** Header cells set `header` to expose a column header role. */
  header?: boolean;
  align?: "left" | "right";
  className?: string;
  children?: ReactNode;
}

export function DataCell({ header = false, align = "left", className, children }: DataCellProps) {
  return (
    <div
      role={header ? "columnheader" : "cell"}
      className={cx("min-w-0", align === "right" && "text-right", className)}
    >
      {children}
    </div>
  );
}
