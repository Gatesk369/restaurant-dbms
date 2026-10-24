import { Button } from "~/components/ui/Button";
import { Chip, ToggleChip } from "~/components/ui/Chip";
import { Icon } from "~/components/ui/Icon";
import { QuantityStepper } from "~/components/ui/QuantityStepper";
import type { MenuItem } from "~/lib/api/types";
import { cx } from "~/lib/cx";
import { placeholderImage } from "~/lib/domain/station";
import { formatAmount, formatUgx } from "~/lib/money";

export interface CartView {
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface MenuStepProps {
  categories: readonly string[];
  category: string;
  onCategory: (category: string) => void;
  onChangeTable: () => void;

  items: readonly MenuItem[];
  quantities: ReadonlyMap<number, number>;
  onAdd: (menuItemId: number) => void;

  /** "Table 6 · Atim". */
  orderFor: string;
  cart: readonly CartView[];
  total: number;
  onIncrement: (menuItemId: number) => void;
  onDecrement: (menuItemId: number) => void;
  onReview: () => void;
}

/** Step 2: category rail, item cards and the cart panel. */
export function MenuStep({
  categories,
  category,
  onCategory,
  onChangeTable,
  items,
  quantities,
  onAdd,
  orderFor,
  cart,
  total,
  onIncrement,
  onDecrement,
  onReview,
}: MenuStepProps) {
  return (
    <div className="station-step station-menu box-border grid flex-1 gap-6 p-6">
      <nav aria-label="Menu categories" className="station-categories flex flex-col gap-2">
        {categories.map((name) => (
          <ToggleChip
            key={name}
            size="rail"
            pressed={category === name}
            onClick={() => onCategory(name)}
          >
            {name}
          </ToggleChip>
        ))}
        <Button variant="tonal" size="touchSm" className="mt-auto" onClick={onChangeTable}>
          Change table
        </Button>
      </nav>

      <section className="flex min-w-0 flex-auto flex-col gap-3">
        <h2 className="m-0 text-panel font-normal">{category}</h2>
        <div className="flex-auto">
          {items.length === 0 ? (
            <p className="m-0 rounded-md bg-tea p-4 text-body tracking-body">
              Nothing in this category today.
            </p>
          ) : null}
          <div className="station-items grid gap-3">
            {items.map((item) => (
              <MenuCard
                key={item.menu_item_id}
                item={item}
                quantity={quantities.get(item.menu_item_id) ?? 0}
                onAdd={() => onAdd(item.menu_item_id)}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="station-cart box-border flex min-w-0 flex-col gap-3 rounded-md border border-tea p-4">
        <div>
          <h2 className="m-0 text-panel font-normal">Your order</h2>
          <p className="m-0 text-label tracking-caption text-moss">{orderFor}</p>
        </div>
        <div className="flex-auto">
          {cart.length === 0 ? (
            <p className="m-0 rounded-md bg-tea p-4 text-body tracking-body">
              Nothing yet. Tap a dish or drink to add it.
            </p>
          ) : null}
          {cart.map((line) => (
            <div
              key={line.menuItemId}
              className="flex flex-wrap items-center gap-2 border-b border-tea py-2"
            >
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
              <div className="min-w-14 flex-none text-right text-body font-bold tabular-nums">
                {formatAmount(line.quantity * line.unitPrice)}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-moss pt-2">
          <span className="text-heading font-bold">Total</span>
          <span className="text-panel font-bold tabular-nums">{formatUgx(total)}</span>
        </div>
        <Button size="touch" className="w-full" disabled={cart.length === 0} onClick={onReview}>
          Review order
        </Button>
      </aside>
    </div>
  );
}

interface MenuCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
}

function MenuCard({ item, quantity, onAdd }: MenuCardProps) {
  const soldOut = !item.availability_status;
  return (
    <button
      type="button"
      disabled={soldOut}
      aria-label={
        soldOut ? `${item.item_name}, sold out` : `Add ${item.item_name}, ${formatUgx(item.price)}`
      }
      onClick={onAdd}
      className={cx(
        "box-border flex min-h-[136px] flex-col justify-between gap-2 rounded-md border px-4 py-3 text-left text-forest",
        soldOut
          ? "cursor-not-allowed border-dashed border-moss bg-page"
          : "cursor-pointer border-transparent bg-tea hover:brightness-95",
      )}
    >
      <img
        src={item.image_url || placeholderImage(item.item_name)}
        onError={(event) => {
          const image = event.currentTarget;
          const fallback = placeholderImage(item.item_name);
          if (image.src !== fallback) image.src = fallback;
        }}
        alt=""
        width={240}
        height={96}
        className={cx(
          "block h-24 w-full rounded-chip bg-field object-cover",
          soldOut && "opacity-50",
        )}
      />
      <span className="flex flex-col gap-1">
        <span className="text-heading font-bold tracking-heading">{item.item_name}</span>
        <span className="text-label tracking-caption text-moss">{item.description}</span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="text-heading font-bold tabular-nums">{formatUgx(item.price)}</span>
        <span className="flex items-center gap-2">
          {quantity > 0 ? <Chip tone="active">×{quantity}</Chip> : null}
          {soldOut ? <Chip>Sold out</Chip> : <Icon name="add" size={24} />}
        </span>
      </span>
    </button>
  );
}
