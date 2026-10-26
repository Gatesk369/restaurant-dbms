import { Icon } from "~/components/ui/Icon";
import { STATION_STEPS } from "~/lib/domain/station";

interface StationHeaderProps {
  /** 0 to 3: the screen the customer is on. */
  current: number;
}

/** Wrapping forest bar: wordmark and four-step progress. */
export function StationHeader({ current }: StationHeaderProps) {
  return (
    <header className="station-header on-forest box-border flex min-h-18 flex-none items-center justify-between gap-6 bg-forest px-6 text-page">
      <span className="text-wordmark">Restaurant DBMS</span>

      <ol aria-label="Order progress" className="m-0 flex list-none items-center p-0">
        {STATION_STEPS.map((label, i) => {
          const done = i < current;
          const on = i === current;
          const status = done ? "completed" : on ? "current" : "upcoming";
          return (
            <li
              key={label}
              aria-current={on ? "step" : undefined}
              aria-label={`Step ${i + 1} of 4, ${label}, ${status}`}
              className="flex items-center gap-2 text-body tracking-bold"
              style={{
                color: on || done ? "var(--color-page)" : "var(--color-on-forest-dim)",
                fontWeight: on ? 700 : 400,
              }}
            >
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className="station-connector mx-2 block h-1 w-12 rounded-[2px]"
                  style={{
                    background: i <= current ? "var(--color-tea)" : "var(--color-moss)",
                  }}
                />
              ) : null}
              <span
                aria-hidden="true"
                className="box-border flex size-8 flex-none items-center justify-center rounded-full border-2 text-body font-bold"
                style={{
                  background: done || on ? "var(--color-tea)" : "transparent",
                  borderColor: done || on ? "var(--color-tea)" : "var(--color-step-outline)",
                  color: done || on ? "var(--color-forest)" : "var(--color-page)",
                }}
              >
                {done ? <Icon name="checkBold" size={18} strokeWidth={3} /> : <span>{i + 1}</span>}
              </span>
              <span aria-hidden="true">{label}</span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
