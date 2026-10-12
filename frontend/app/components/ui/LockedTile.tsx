import { cx } from "~/lib/cx";
import { Icon, type IconName } from "./Icon";

interface LockedTileProps {
  title: string;
  /** Shown in place of the screen's own icon; defaults to the padlock. */
  icon?: IconName;
  /** "Cashier" renders "Locked for Cashier". */
  roleLabel: string;
  className?: string;
}

/** A screen the signed-in role cannot use: dashed, padlocked, not focusable. */
export function LockedTile({ title, icon = "lock", roleLabel, className }: LockedTileProps) {
  return (
    <div
      className={cx(
        "box-border flex min-h-30 flex-col gap-2 rounded-md border border-dashed border-moss p-4 text-moss",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-heading font-bold tracking-heading">
        <Icon name={icon} />
        {title}
      </span>
      <span className="text-body tracking-body">Locked for {roleLabel}</span>
    </div>
  );
}
