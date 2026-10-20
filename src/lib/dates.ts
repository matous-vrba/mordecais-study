const DAY_MS = 86_400_000;

/** Whole days since 1970-01-01 in the phone's local calendar. */
export function dayIndex(date: Date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

export function dayLabel(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}
