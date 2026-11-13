import type { Cents } from "./money";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtMoney(cents: Cents | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  const dollars = cents / 100;
  const s = usd.format(Math.abs(dollars));
  return dollars < 0 ? `−${s}` : s;
}

export function fmtMoneyExact(cents: Cents | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  const dollars = cents / 100;
  const s = usdCents.format(Math.abs(dollars));
  return dollars < 0 ? `−${s}` : s;
}

export function fmtNum(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const s = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return value < 0 ? `−${s}` : s;
}

/** Parse user-entered dollars ("34,000", "$34k", "1.2m") to cents. */
export function parseMoneyInput(raw: string): Cents | null {
  const cleaned = raw.trim().toLowerCase().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const m = /^(-?\d*\.?\d+)([km])?$/.exec(cleaned);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  if (m[2] === "m") n *= 1_000_000;
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
