import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isValid, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import type { Expense } from '@/domains/expenses/api';

export type PeriodPreset = 'daily' | 'weekly' | 'monthly' | 'custom';

/** Inclusive ISO (yyyy-MM-dd) range — expense_date is a date, not a timestamp. */
export interface DateRange {
  start: string;
  end: string;
}

const WEEK_OPTIONS = { weekStartsOn: 1 } as const; // UAE week runs Mon–Sun for reporting
const MAX_DAILY_BUCKET_SPAN = 62;

export function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function isValidRange(range: DateRange | undefined): range is DateRange {
  return Boolean(range && range.start && range.end && range.start <= range.end);
}

export function daysInRange(range: DateRange): number {
  return differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1;
}

export function resolveRange(preset: Exclude<PeriodPreset, 'custom'>, anchor: Date): DateRange {
  if (preset === 'daily') return { start: toISO(anchor), end: toISO(anchor) };
  if (preset === 'weekly') {
    return { start: toISO(startOfWeek(anchor, WEEK_OPTIONS)), end: toISO(endOfWeek(anchor, WEEK_OPTIONS)) };
  }
  return { start: toISO(startOfMonth(anchor)), end: toISO(endOfMonth(anchor)) };
}

/** The equivalent period immediately before: yesterday, last week, last month, or the same-length window. */
export function previousRange(preset: PeriodPreset, range: DateRange): DateRange {
  const start = parseISO(range.start);
  if (preset === 'daily') {
    const d = toISO(addDays(start, -1));
    return { start: d, end: d };
  }
  if (preset === 'weekly') return { start: toISO(addDays(start, -7)), end: toISO(addDays(parseISO(range.end), -7)) };
  if (preset === 'monthly') {
    const prev = subMonths(start, 1);
    return { start: toISO(startOfMonth(prev)), end: toISO(endOfMonth(prev)) };
  }
  const length = daysInRange(range);
  const end = addDays(start, -1);
  return { start: toISO(addDays(end, -(length - 1))), end: toISO(end) };
}

/** Moves the anchor one period back (-1) or forward (+1) for the prev/next stepper. */
export function shiftAnchor(preset: Exclude<PeriodPreset, 'custom'>, anchor: Date, direction: -1 | 1): Date {
  if (preset === 'daily') return addDays(anchor, direction);
  if (preset === 'weekly') return addDays(anchor, 7 * direction);
  const shifted = new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  return shifted;
}

export function filterByRange(expenses: Expense[], range: DateRange): Expense[] {
  return expenses.filter((e) => e.expense_date >= range.start && e.expense_date <= range.end);
}

export interface PeriodSummary {
  total: number;
  count: number;
  averagePerTransaction: number;
  dailyAverage: number;
  largest: Expense | null;
  activeDays: number;
  receiptCount: number;
}

/** `todayISO` keeps the daily average honest for an in-progress period (days elapsed, not days in the whole period). */
export function summarize(expenses: Expense[], range: DateRange, todayISO: string): PeriodSummary {
  const total = expenses.reduce((sum, e) => sum + e.amount_aed, 0);
  const count = expenses.length;
  const effectiveEnd = todayISO < range.end ? (todayISO < range.start ? range.start : todayISO) : range.end;
  const elapsed = Math.max(1, daysInRange({ start: range.start, end: effectiveEnd }));
  return {
    total,
    count,
    averagePerTransaction: count > 0 ? total / count : 0,
    dailyAverage: total / elapsed,
    largest: expenses.reduce<Expense | null>((max, e) => (max === null || e.amount_aed > max.amount_aed ? e : max), null),
    activeDays: new Set(expenses.map((e) => e.expense_date)).size,
    receiptCount: expenses.filter((e) => e.receipt_photo_path).length,
  };
}

export interface Delta {
  absolute: number;
  /** null when the previous period had no spend, so a percentage would be meaningless. */
  percent: number | null;
}

export function computeDelta(current: number, previous: number): Delta {
  return { absolute: current - previous, percent: previous === 0 ? null : ((current - previous) / previous) * 100 };
}

export interface BreakdownRow {
  key: string;
  total: number;
  count: number;
  share: number;
}

export function breakdownBy(expenses: Expense[], keyFn: (e: Expense) => string): BreakdownRow[] {
  const grand = expenses.reduce((sum, e) => sum + e.amount_aed, 0);
  const groups = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const key = keyFn(e);
    const g = groups.get(key) ?? { total: 0, count: 0 };
    g.total += e.amount_aed;
    g.count += 1;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, total: g.total, count: g.count, share: grand > 0 ? (g.total / grand) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Case/whitespace-insensitive description grouping so "Coffee" and " coffee " count as one item. */
export function itemKey(e: Expense, fallbackLabel: string): string {
  const description = e.description?.trim().replace(/\s+/g, ' ');
  return description ? description.charAt(0).toUpperCase() + description.slice(1).toLowerCase() : fallbackLabel;
}

export interface TrendPoint {
  label: string;
  date: string;
  total: number;
  count: number;
  /** Spend on the same-index day of the previous period; undefined when there is no comparable day. */
  previousTotal?: number;
}

export function trendSeries(expenses: Expense[], range: DateRange, previous?: { range: DateRange; expenses: Expense[] }): TrendPoint[] {
  const byWeek = daysInRange(range) > MAX_DAILY_BUCKET_SPAN;
  const days = daysInRange(range);
  const points: TrendPoint[] = [];
  const start = parseISO(range.start);

  if (byWeek) {
    for (let offset = 0; offset < days; offset += 7) {
      const bucketStart = toISO(addDays(start, offset));
      const bucketEnd = toISO(addDays(start, Math.min(offset + 6, days - 1)));
      const inBucket = expenses.filter((e) => e.expense_date >= bucketStart && e.expense_date <= bucketEnd);
      points.push({
        label: format(parseISO(bucketStart), 'd MMM'),
        date: bucketStart,
        total: inBucket.reduce((s, e) => s + e.amount_aed, 0),
        count: inBucket.length,
      });
    }
    return points;
  }

  const totals = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const t = totals.get(e.expense_date) ?? { total: 0, count: 0 };
    t.total += e.amount_aed;
    t.count += 1;
    totals.set(e.expense_date, t);
  }
  const prevTotals = new Map<string, number>();
  for (const e of previous?.expenses ?? []) prevTotals.set(e.expense_date, (prevTotals.get(e.expense_date) ?? 0) + e.amount_aed);

  for (let i = 0; i < days; i += 1) {
    const date = toISO(addDays(start, i));
    const t = totals.get(date);
    const prevDate = previous && i < daysInRange(previous.range) ? toISO(addDays(parseISO(previous.range.start), i)) : undefined;
    points.push({
      label: format(parseISO(date), days <= 7 ? 'EEE d' : 'd'),
      date,
      total: t?.total ?? 0,
      count: t?.count ?? 0,
      previousTotal: prevDate ? (prevTotals.get(prevDate) ?? 0) : undefined,
    });
  }
  return points;
}

export function describeRange(range: DateRange): string {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  if (range.start === range.end) return format(start, 'EEE, d MMM yyyy');
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

const PRESETS: PeriodPreset[] = ['daily', 'weekly', 'monthly', 'custom'];

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) && toISO(d) === value ? d : null;
}

export interface PeriodState {
  preset: PeriodPreset;
  anchor: Date;
  custom: DateRange;
}

/** Reads the filter from the URL so it survives refresh/back; any malformed value falls back to a safe default. */
export function parsePeriodParams(params: URLSearchParams, today: Date): PeriodState {
  const rawPreset = params.get('period');
  const preset = PRESETS.find((p) => p === rawPreset) ?? 'monthly';
  const anchor = parseDateParam(params.get('date')) ?? today;
  const from = parseDateParam(params.get('from'));
  const to = parseDateParam(params.get('to'));
  const custom = from && to ? { start: toISO(from), end: toISO(to) } : { start: toISO(addDays(today, -29)), end: toISO(today) };
  return { preset, anchor, custom };
}
