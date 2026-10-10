import {
  endOfMonth,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { getJobDateOnly } from "@/lib/dates";
import type { Expense, Job } from "@/types";

export const SPLIT_PRESETS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom" },
] as const;

export type SplitPreset = (typeof SPLIT_PRESETS)[number]["id"];

export interface DateRange {
  from: string;
  to: string;
}

export function getPresetRange(
  preset: Exclude<SplitPreset, "custom">,
  now = new Date(),
): DateRange {
  const today = format(now, "yyyy-MM-dd");

  switch (preset) {
    case "7d":
      return { from: format(subDays(now, 6), "yyyy-MM-dd"), to: today };
    case "30d":
      return { from: format(subDays(now, 29), "yyyy-MM-dd"), to: today };
    case "month":
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "lastMonth": {
      const previous = subMonths(now, 1);
      return {
        from: format(startOfMonth(previous), "yyyy-MM-dd"),
        to: format(endOfMonth(previous), "yyyy-MM-dd"),
      };
    }
    case "year":
      return { from: format(startOfYear(now), "yyyy-MM-dd"), to: today };
  }
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function jobsInRange(jobs: Job[], range: DateRange, include: (job: Job) => boolean) {
  return jobs
    .filter((job) => include(job) && inRange(getJobDateOnly(job.jobDate), range.from, range.to))
    .sort((a, b) => getJobDateOnly(b.jobDate).localeCompare(getJobDateOnly(a.jobDate)));
}

export interface SplitSummary {
  jobCount: number;
  gross: number;
  expensesTotal: number;
  ownerExpenses: number;
  paidByJared: number;
  paidByJustin: number;
  net: number;
  ownerNet: number;
  /** Jared's half of the expenses Justin paid. */
  jaredOwesJustin: number;
  /** Jared's half of the checks, plus Justin's half of the expenses Jared paid. */
  justinOwesJared: number;
  /** Positive means Justin pays Jared. Negative means Jared pays Justin. */
  justinPaysJared: number;
  jobs: Job[];
  expenses: Expense[];
}

export interface SettlementFigures {
  gross: number;
  expenses: number;
  net: number;
  each: number;
  jaredPaid: number;
  justinPaid: number;
  /** Jared's half plus the expenses he already paid. Justin sends this from the checks. */
  jaredPayout: number;
  /** What Justin has left after his expenses and Jared's payout. */
  justinKeeps: number;
  jaredFinal: number;
  /** Both owners finish on the same amount. */
  balanced: boolean;
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(cents: number) {
  return cents / 100;
}

/** The on-screen settlement, in cents, so each line of the equation adds up. */
export function settlementFigures(summary: SplitSummary): SettlementFigures {
  const gross = toCents(summary.gross);
  const expenses = toCents(summary.expensesTotal);
  const net = gross - expenses;
  const each = Math.round(net / 2);
  const jaredPaid = toCents(summary.paidByJared);
  const justinPaid = toCents(summary.paidByJustin);
  const jaredPayout = each + jaredPaid;
  const justinKeeps = gross - justinPaid - jaredPayout;
  const jaredFinal = jaredPayout - jaredPaid;

  return {
    gross: fromCents(gross),
    expenses: fromCents(expenses),
    net: fromCents(net),
    each: fromCents(each),
    jaredPaid: fromCents(jaredPaid),
    justinPaid: fromCents(justinPaid),
    jaredPayout: fromCents(jaredPayout),
    justinKeeps: fromCents(justinKeeps),
    jaredFinal: fromCents(jaredFinal),
    balanced: jaredFinal === justinKeeps,
  };
}

function summarize(includedJobs: Job[], expenses: Expense[], range: DateRange): SplitSummary {
  const rangedExpenses = expenses
    .filter((expense) => inRange(getJobDateOnly(expense.date), range.from, range.to))
    .sort((a, b) => getJobDateOnly(b.date).localeCompare(getJobDateOnly(a.date)));

  // Job totals only. Whether the customer has paid is ignored on purpose.
  const gross = includedJobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);
  const expensesTotal = rangedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidByJared = rangedExpenses
    .filter((expense) => expense.paidBy === "Jared")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const paidByJustin = rangedExpenses
    .filter((expense) => expense.paidBy === "Justin")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const net = gross - expensesTotal;
  const ownerNet = net / 2;

  // Justin holds the customer checks. Each owner covers half of every expense.
  // Jared owes Justin half of what Justin paid. Justin owes Jared half the
  // checks, plus half of what Jared paid. The difference is the cash transfer,
  // and it can run either direction.
  const jaredOwesJustin = paidByJustin / 2;
  const justinOwesJared = gross / 2 + paidByJared / 2;
  const justinPaysJared = justinOwesJared - jaredOwesJustin;

  return {
    jobCount: includedJobs.length,
    gross,
    expensesTotal,
    ownerExpenses: expensesTotal / 2,
    paidByJared,
    paidByJustin,
    net,
    ownerNet,
    jaredOwesJustin,
    justinOwesJared,
    justinPaysJared,
    jobs: includedJobs,
    expenses: rangedExpenses,
  };
}

export function computeSplit(
  jobs: Job[],
  expenses: Expense[],
  range: DateRange,
): SplitSummary {
  return summarize(
    jobsInRange(jobs, range, (job) => job.status === "Completed"),
    expenses,
    range,
  );
}

/**
 * Projected split for the same date range if every job that is not cancelled
 * finishes at its current price and no further expenses are added.
 */
export function computeOnTarget(
  jobs: Job[],
  expenses: Expense[],
  range: DateRange,
): SplitSummary {
  return summarize(
    jobsInRange(jobs, range, (job) => job.status !== "Cancelled"),
    expenses,
    range,
  );
}
