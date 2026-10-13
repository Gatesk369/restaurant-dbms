const TIME_ZONE = "Africa/Kampala";

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "12:41" in restaurant time. */
export function clockTime(date: Date = new Date()): string {
  return clock.format(date);
}

/** True when both instants fall on the same calendar day in Kampala. */
export function isSameKampalaDay(a: Date | string, b: Date | string): boolean {
  return day.format(new Date(a)) === day.format(new Date(b));
}

/** Today's date in restaurant time, as YYYY-MM-DD. */
export function kampalaDate(date: Date = new Date()): string {
  return day.format(date);
}
