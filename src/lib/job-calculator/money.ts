/**
 * Money arithmetic in integer cents.
 *
 * Every monetary value flowing through the engine is an integer number of
 * cents. Fractional operations round to the nearest cent at the boundary of
 * each normalization step so totals are reproducible and never drift.
 */
export type Cents = number;

export const AVERAGE_WEEKS_PER_MONTH = 52 / 12; // 4.3333…

export function dollarsToCents(dollars: number): Cents {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: Cents): number {
  return cents / 100;
}

/** Multiply cents by an arbitrary real factor and round to the nearest cent. */
export function mul(cents: Cents, factor: number): Cents {
  if (!Number.isFinite(factor)) return 0;
  return Math.round(cents * factor);
}

/** Divide cents by a real divisor, returning 0 for a zero divisor. */
export function div(cents: Cents, divisor: number): Cents {
  if (!divisor || !Number.isFinite(divisor)) return 0;
  return Math.round(cents / divisor);
}

/** Percentage of a cents value (percent expressed as 0–100). */
export function pctOf(cents: Cents, percent: number): Cents {
  if (!Number.isFinite(percent)) return 0;
  return Math.round((cents * percent) / 100);
}

export function sum(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Safe ratio: returns null instead of dividing by zero. */
export function ratio(numerator: number, denominator: number): number | null {
  if (!denominator || !Number.isFinite(denominator)) return null;
  return numerator / denominator;
}

/** Margin (0–100 percent) or null when revenue is zero. */
export function marginPct(profit: Cents, revenue: Cents): number | null {
  const r = ratio(profit, revenue);
  return r === null ? null : r * 100;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
