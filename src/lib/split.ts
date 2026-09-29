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

export interface SplitSummary {
  jobCount: number;
  gross: number;
  expensesTotal: number;
  ownerExpenses: number;
  net: number;
  ownerNet: number;
  jobs: Job[];
  expenses: Expense[];
}

export function computeSplit(
  jobs: Job[],
  expenses: Expense[],
  range: DateRange,
): SplitSummary {
  const completed = jobs
    .filter(
      (job) =>
        job.status === "Completed" &&
        inRange(getJobDateOnly(job.jobDate), range.from, range.to),
    )
    .sort((a, b) => getJobDateOnly(b.jobDate).localeCompare(getJobDateOnly(a.jobDate)));

  const rangedExpenses = expenses
    .filter((expense) => inRange(getJobDateOnly(expense.date), range.from, range.to))
    .sort((a, b) => getJobDateOnly(b.date).localeCompare(getJobDateOnly(a.date)));

  const gross = completed.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);
  const expensesTotal = rangedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const net = gross - expensesTotal;

  return {
    jobCount: completed.length,
    gross,
    expensesTotal,
    ownerExpenses: expensesTotal / 2,
    net,
    ownerNet: net / 2,
    jobs: completed,
    expenses: rangedExpenses,
  };
}
