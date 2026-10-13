import { Panel, PanelHeading } from "./Panel";

export interface ActivityEntry {
  /** "12:41". */
  time: string;
  /** "TABLES: Table 9 free_status set to FALSE". */
  text: string;
}

interface ActivityLogProps {
  title?: string;
  /** What the log is about, e.g. "Triggers that run when an order is placed or changes status." */
  description: string;
  /** Newest first. */
  entries: readonly ActivityEntry[];
  /** Shown while there are no entries yet. */
  empty?: string;
}

/** The "Database activity" panel: makes the triggers behind each action visible. */
export function ActivityLog({
  title = "Database activity",
  description,
  entries,
  empty,
}: ActivityLogProps) {
  return (
    <Panel>
      <PanelHeading title={title} caption={description} />
      {entries.length === 0 && empty ? (
        <p className="m-0 text-label tracking-caption">{empty}</p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {entries.map((entry, i) => (
          <li
            key={`${i}-${entry.time}-${entry.text}`}
            className="flex gap-3 text-label tracking-caption"
          >
            <span className="flex-none font-bold text-moss tabular-nums">{entry.time}</span>
            <span className="min-w-0">{entry.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
