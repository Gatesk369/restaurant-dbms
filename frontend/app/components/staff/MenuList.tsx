import { Button } from "~/components/ui/Button";
import { Chip, ToggleChip, ToggleGroup } from "~/components/ui/Chip";
import { DataCell, DataHeader, DataRow, DataTable } from "~/components/ui/DataTable";
import { Icon } from "~/components/ui/Icon";
import { Panel } from "~/components/ui/Panel";
import type { MenuFeatures } from "~/lib/api/menu";
import { MENU_CATEGORIES, type MenuItem } from "~/lib/api/types";
import { categoryOf } from "~/lib/domain/menu-categories";
import { STATUS_LABEL, STATUS_TONE, itemStatus, menuItemNumber } from "~/lib/domain/menu";
import { formatAmount } from "~/lib/money";

const COLUMNS = "76px minmax(0,1.6fr) 100px 112px 124px 200px";

interface MenuListProps {
  items: readonly MenuItem[];
  features: MenuFeatures;
  /** How many items exist, for "Showing n of N". */
  totalCount: number;
  archivedCount: number;

  search: string;
  onSearch: (value: string) => void;
  showArchived: boolean;
  onShowArchived: (value: boolean) => void;
  category: string;
  onCategory: (category: string) => void;

  /** Item whose editor is open (tea fill). */
  editingId: number | null;
  /** Item with a request in flight. */
  busyId: number | null;
  disabled?: boolean;
  onEdit: (item: MenuItem) => void;
  onToggleArchive: (item: MenuItem) => void;
}

/** Search, filters and the ARIA table of menu items. */
export function MenuList({
  items,
  features,
  totalCount,
  archivedCount,
  search,
  onSearch,
  showArchived,
  onShowArchived,
  category,
  onCategory,
  editingId,
  busyId,
  disabled = false,
  onEdit,
  onToggleArchive,
}: MenuListProps) {
  return (
    <Panel gap="md" className="min-w-0 flex-[999_1_620px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="relative min-w-0 flex-[1_1_240px]">
          <label htmlFor="menu-search" className="sr-only">
            Search menu items
          </label>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-moss">
            <Icon name="search" />
          </span>
          <input
            id="menu-search"
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="box-border block min-h-12 w-full rounded-md border-0 bg-field p-3 pl-11 text-[16px] leading-[normal] tracking-body text-forest shadow-[inset_0_-1px_0_var(--color-moss)] focus:shadow-[inset_0_-2px_0_var(--color-moss)]"
          />
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-body font-bold tracking-bold">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchived(e.target.checked)}
            className="m-0 size-5 accent-moss"
          />
          Show archived ({archivedCount})
        </label>
      </div>

      <ToggleGroup label="Menu category">
        {["All", ...MENU_CATEGORIES].map((name) => (
          <ToggleChip key={name} pressed={category === name} onClick={() => onCategory(name)}>
            {name}
          </ToggleChip>
        ))}
      </ToggleGroup>

      <DataTable label="Menu items" columns={COLUMNS} minWidth={860}>
        <DataHeader>
          <DataCell header>ID</DataCell>
          <DataCell header>Item</DataCell>
          <DataCell header>Category</DataCell>
          <DataCell header align="right">
            Price (UGX)
          </DataCell>
          <DataCell header>Status</DataCell>
          <DataCell header>Actions</DataCell>
        </DataHeader>
        {items.map((item) => {
          const status = itemStatus(item, features);
          return (
            <DataRow key={item.menu_item_id} hoverable selected={editingId === item.menu_item_id}>
              <DataCell className="font-bold text-moss">
                {menuItemNumber(item.menu_item_id)}
              </DataCell>
              <DataCell className="font-bold">{item.item_name}</DataCell>
              <DataCell>{categoryOf(item) ?? "—"}</DataCell>
              <DataCell align="right" className="tabular-nums">
                {formatAmount(item.price)}
              </DataCell>
              <DataCell>
                {/* The mock-up gives every status chip on this screen a 1px border. */}
                <Chip
                  tone={STATUS_TONE[status]}
                  className={status === "archived" ? undefined : "border border-transparent"}
                >
                  {STATUS_LABEL[status]}
                </Chip>
              </DataCell>
              <DataCell className="flex gap-2">
                <Button
                  variant="tonal"
                  size="row"
                  disabled={disabled}
                  aria-label={`Edit ${item.item_name}`}
                  onClick={() => onEdit(item)}
                >
                  <Icon name="edit" size={18} />
                  Edit
                </Button>
                {status === "archived" ? (
                  <Button
                    variant="tonal"
                    size="row"
                    pendingLabel="Restoring item…"
                    aria-label={`Restore ${item.item_name}`}
                    pending={busyId === item.menu_item_id}
                    disabled={disabled}
                    onClick={() => onToggleArchive(item)}
                  >
                    <Icon name="restore" size={18} />
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="tonal"
                    size="row"
                    pendingLabel="Archiving item…"
                    aria-label={`Archive ${item.item_name}`}
                    pending={busyId === item.menu_item_id}
                    disabled={disabled}
                    onClick={() => onToggleArchive(item)}
                  >
                    <Icon name="archive" size={18} />
                    Archive
                  </Button>
                )}
              </DataCell>
            </DataRow>
          );
        })}
      </DataTable>

      {items.length === 0 ? (
        <p className="m-0 rounded-md bg-tea p-4 text-body tracking-body">
          No items match. Clear the search or pick another category.
        </p>
      ) : null}

      <p className="m-0 text-label tracking-caption text-moss">
        Showing {items.length} of {totalCount} items. Archived items stay on past orders and reports
        but cannot be ordered.
      </p>
    </Panel>
  );
}
