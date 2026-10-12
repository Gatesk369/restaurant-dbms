import { cx } from "~/lib/cx";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface QuantityStepperProps {
  value: number;
  /** Item name for the spoken labels: "Remove one Rolex" / "Add one Rolex". */
  itemName: string;
  onDecrement: () => void;
  onIncrement: () => void;
  /** md: 44px buttons (staff ticket, station cart) · lg: 48px (station review). */
  size?: "md" | "lg";
}

/** Plus and minus buttons around the count. There is no free typing. */
export function QuantityStepper({
  value,
  itemName,
  onDecrement,
  onIncrement,
  size = "md",
}: QuantityStepperProps) {
  return (
    <div className="flex flex-none items-center gap-1">
      <Button
        variant="tonal"
        size={size}
        icon
        aria-label={`Remove one ${itemName}`}
        onClick={onDecrement}
      >
        <Icon name="minus" size={18} />
      </Button>
      <span
        className={cx("text-center text-heading font-bold", size === "lg" ? "min-w-8" : "min-w-6")}
      >
        {value}
      </span>
      <Button
        variant="tonal"
        size={size}
        icon
        aria-label={`Add one ${itemName}`}
        onClick={onIncrement}
      >
        <Icon name="add" size={18} />
      </Button>
    </div>
  );
}
