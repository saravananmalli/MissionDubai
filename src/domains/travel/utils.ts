/** Whole calendar days from `from` to `targetDateISO` (YYYY-MM-DD), ignoring time-of-day. Negative if already past. */
export function daysUntil(targetDateISO: string, from: Date = new Date()): number {
  const target = new Date(`${targetDateISO}T00:00:00`);
  const startMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((targetMidnight.getTime() - startMidnight.getTime()) / msPerDay);
}
