import { AVERAGE_WEEKS_PER_MONTH } from "./money";
import type { SeasonConfig, WeeksMethod } from "./types";

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTH_LABELS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Days per month in a non-leap year — the engine uses a fixed 365-day calendar. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Weeks in a given month.
 *  - average:  52 / 12 for every month (4.3333…). 12 months = exactly 52 weeks.
 *  - calendar: daysInMonth / 7. 12 months = 52.14 weeks.
 */
export function weeksInMonth(monthIndex: number, method: WeeksMethod): number {
  if (method === "calendar") return DAYS_IN_MONTH[monthIndex] / 7;
  return AVERAGE_WEEKS_PER_MONTH;
}

export function activeMonthIndexes(season: SeasonConfig): number[] {
  const out: number[] = [];
  season.activeMonths.forEach((on, i) => on && out.push(i));
  return out;
}

export function firstActiveMonth(season: SeasonConfig): number {
  const idx = season.activeMonths.findIndex(Boolean);
  return idx === -1 ? 0 : idx;
}

export function operatingMonthCount(season: SeasonConfig): number {
  return season.activeMonths.filter(Boolean).length;
}

/** Build a contiguous active-month mask from a start month and length (wraps around year end). */
export function contiguousSeason(startMonth: number, length: number): boolean[] {
  const mask = new Array<boolean>(12).fill(false);
  const n = Math.max(0, Math.min(12, Math.round(length)));
  for (let i = 0; i < n; i++) mask[(startMonth + i) % 12] = true;
  return mask;
}

/** Infer the (start, length) of a season mask if it is contiguous; otherwise null. */
export function inferContiguous(mask: boolean[]): { start: number; length: number } | null {
  const count = mask.filter(Boolean).length;
  if (count === 0) return { start: 0, length: 0 };
  if (count === 12) return { start: 0, length: 12 };
  for (let start = 0; start < 12; start++) {
    if (!mask[start] || mask[(start + 11) % 12]) continue;
    let ok = true;
    for (let i = 0; i < count; i++) if (!mask[(start + i) % 12]) ok = false;
    if (ok) return { start, length: count };
  }
  return null;
}
