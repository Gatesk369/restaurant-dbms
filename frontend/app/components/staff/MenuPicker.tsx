import { Chip, ToggleChip, ToggleGroup } from "~/components/ui/Chip";
import { Icon } from "~/components/ui/Icon";
import { Panel, PanelHeading } from "~/components/ui/Panel";
import type { MenuItem } from "~/lib/api/types";
import { formatUgx } from "~/lib/money";

interface MenuPickerProps {
  items: readonly MenuItem[];
  categories: readonly string[];
  category: string;
  onCategory: (category: string) => void;
  quantities: ReadonlyMap<number, number>;
  onAdd: (menuItemId: number) => void;
}

/** "Menu items": category toggle chips and a grid of add-to-order buttons. */
export function MenuPicker({
  items,
  categories,
  category,
  onCategory,
  quantities,
  onAdd,
}: MenuPickerProps) {
  return (
    <Panel>
      <PanelHeading title="Menu items">
        <ToggleGroup label="Menu category">
          {["All", ...categories].map((name) => (
            <ToggleChip key={name} pressed={category === name} onClick={() => onCategory(name)}>
              {name}
            </ToggleChip>
          ))}
        </ToggleGroup>
      </PanelHeading>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
        {items.map((item) => {
          const quantity = quantities.get(item.menu_item_id) ?? 0;
          return (
            <button
              key={item.menu_item_id}
              type="button"
              aria-label={`Add ${item.item_name}, ${formatUgx(item.price)}`}
              onClick={() => onAdd(item.menu_item_id)}
              className="box-border flex min-h-16 cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-tea px-3 py-2 text-left text-forest hover:brightness-95"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-body font-bold tracking-bold">{item.item_name}</span>
                <span className="text-body tracking-body text-moss">{formatUgx(item.price)}</span>
              </span>
              <span className="flex flex-none items-center gap-2">
                {quantity > 0 ? <Chip tone="active">×{quantity}</Chip> : null}
                <Icon name="add" />
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
