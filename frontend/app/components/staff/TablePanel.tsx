import { Panel, PanelHeading } from "~/components/ui/Panel";
import { TableTile } from "~/components/ui/TableTile";
import type { Table } from "~/lib/api/types";
import { tableAriaLabel, tableLabel, tableSub } from "~/lib/domain/tables";

interface TablePanelProps {
  tables: readonly Table[];
  selected: number | null;
  onSelect: (tableId: number) => void;
}

/** The "Table" panel: a six-column grid of tiles; occupied tables are disabled. */
export function TablePanel({ tables, selected, onSelect }: TablePanelProps) {
  return (
    <Panel>
      <PanelHeading title="Table" />
      <div className="grid grid-cols-6 gap-2">
        {tables.map((table) => (
          <TableTile
            key={table.table_id}
            label={tableLabel(table)}
            sub={tableSub(table)}
            ariaLabel={tableAriaLabel(table)}
            state={!table.free_status ? "busy" : selected === table.table_id ? "selected" : "free"}
            onSelect={() => onSelect(table.table_id)}
          />
        ))}
      </div>
    </Panel>
  );
}
