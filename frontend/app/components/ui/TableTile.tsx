import { cx } from "~/lib/cx";

export type TableTileState = "free" | "selected" | "busy";

interface TableTileProps {
  /** "T7". */
  label: string;
  /** "4 seats", "Occupied" or "In use". */
  sub: string;
  state: TableTileState;
  /** staff: 6-column picker on Orders (64) · station: 4x3 grid (96). */
  size?: "staff" | "station";
  /** Spoken name, e.g. "Table 7, 4 seats" or "Table 7, occupied". */
  ariaLabel: string;
  onSelect?: () => void;
}

const STATES: Record<TableTileState, string> = {
  free: "cursor-pointer border-transparent bg-tea text-forest hover:brightness-95",
  selected: "cursor-pointer border-transparent bg-moss text-white hover:brightness-95",
  busy: "cursor-not-allowed border-dashed border-moss bg-page text-moss",
};

/** Table picker tile. Busy tables are disabled; selection is `aria-pressed`. */
export function TableTile({
  label,
  sub,
  state,
  size = "staff",
  ariaLabel,
  onSelect,
}: TableTileProps) {
  const station = size === "station";
  return (
    <button
      type="button"
      disabled={state === "busy"}
      aria-pressed={state === "selected"}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cx(
        "box-border flex flex-col items-center justify-center gap-0.5 rounded-md border",
        station ? "min-h-24 p-2" : "min-h-16 p-1",
        STATES[state],
      )}
    >
      <span className={cx("font-bold", station ? "text-panel" : "text-heading")}>{label}</span>
      <span className={station ? "text-label tracking-caption" : "text-micro tracking-micro"}>
        {sub}
      </span>
    </button>
  );
}
