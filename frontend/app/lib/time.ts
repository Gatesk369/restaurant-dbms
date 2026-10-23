const TIME_ZONE = "Africa/Kampala";

const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** True when both instants fall on the same calendar day in Kampala. */
export function isSameKampalaDay(a: Date | string, b: Date | string): boolean {
  return day.format(new Date(a)) === day.format(new Date(b));
}

/** Today's date in restaurant time, as YYYY-MM-DD. */
export function kampalaDate(date: Date = new Date()): string {
  return day.format(date);
}
