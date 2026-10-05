import {
  addDays,
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  max,
  min,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { getJobDateOnly } from "@/lib/dates";
import { getCustomerName } from "@/lib/utils";
import { JOB_STATUSES, type JobStatus } from "@/lib/constants";
import { buildTopCustomersByHousehold, buildHouseholdIndex } from "@/lib/household-display";
import type { CustomerInsight } from "@/lib/household-display";
import type { Customer, Expense, Job } from "@/types";

function getJobCustomer(job: Job): Customer | null {
  return typeof job.customer === "object" && job.customer !== null ? job.customer : null;
}

function countUniqueCustomerGroups(jobs: Job[]): number {
  const householdIndex = buildHouseholdIndex(jobs);
  return new Set(
    jobs.map((job) => {
      const customer = getJobCustomer(job);
      if (!customer) return getCustomerName(job);
      return householdIndex.get(customer._id)?.key ?? `solo:${customer._id}`;
    })
  ).size;
}
export interface StatusCount {
  status: JobStatus;
  count: number;
}

export interface ServiceInsight {
  name: string;
  count: number;
  revenue: number;
}

/** A single bar on any revenue chart (day, week, or month). */
export interface RevenuePoint {
  key: string;
  label: string;
  shortLabel: string;
  startDate: string;
  endDate: string;
  revenue: number;
  collected: number;
  jobs: number;
  completed: number;
  workingDays?: number;
  weekIndex?: number;
}

export interface QuarterlyRevenue {
  quarter: number;
  label: string;
  revenue: number;
  collected: number;
  jobs: number;
  completed: number;
}

export interface WeekInsights {
  label: string;
  weekStart: string;
  weekEnd: string;
  revenue: number;
  collected: number;
  outstanding: number;
  jobsTotal: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  paidJobs: number;
  averageJobValue: number;
  averageCompletedJobValue: number;
  dailyRevenue: RevenuePoint[];
  statusCounts: StatusCount[];
  topServices: ServiceInsight[];
}

export interface MonthInsights {
  year: number;
  month: number;
  label: string;
  revenue: number;
  collected: number;
  outstanding: number;
  pipeline: number;
  jobsTotal: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  paidJobs: number;
  averageJobValue: number;
  averageCompletedJobValue: number;
  statusCounts: StatusCount[];
  topServices: ServiceInsight[];
  weeklyRevenue: RevenuePoint[];
}

export interface YearInsights {
  year: number;
  revenueTotal: number;
  revenueCollected: number;
  revenueOutstanding: number;
  jobsTotal: number;
  jobsCompleted: number;
  jobsCancelled: number;
  uniqueCustomers: number;
  averageJobValue: number;
  averageCompletedJobValue: number;
  collectionRate: number;
  monthlyRevenue: RevenuePoint[];
  quarterlyRevenue: QuarterlyRevenue[];
  topServices: ServiceInsight[];
  topCustomers: CustomerInsight[];
  bestMonth: { label: string; revenue: number } | null;
  priorYearRevenue: number | null;
  yearOverYearChange: number | null;
  statusCounts: StatusCount[];
}

export interface RangeInsights {
  label: string;
  start: string;
  end: string;
  revenue: number;
  collected: number;
  outstanding: number;
  jobsTotal: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  paidJobs: number;
  averageJobValue: number;
  uniqueCustomers: number;
  statusCounts: StatusCount[];
  topServices: ServiceInsight[];
  topCustomers: CustomerInsight[];
  buckets: RevenuePoint[];
  bucketDescription: string;
}

export interface InsightOptions {
  year?: number;
  month?: number;
  /** Any date inside the week to show. Monday–Sunday. */
  weekStart?: string;
}

export interface BusinessInsights {
  availableYears: number[];
  todayJobs: Job[];
  tomorrowJobs: Job[];
  upcomingJobs: Job[];
  needsFollowUpCount: number;
  unpaidJobsCount: number;
  week: WeekInsights;
  month: MonthInsights;
  year: YearInsights;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK_STARTS_ON = 1 as const;

/** Monday–Sunday range containing `anchor` (an ISO date or a local Date). */
export function calendarWeekRange(anchor: string | Date) {
  const date = typeof anchor === "string" ? new Date(`${anchor.slice(0, 10)}T12:00:00`) : anchor;
  return {
    start: format(startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }), "yyyy-MM-dd"),
    end: format(endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }), "yyyy-MM-dd"),
  };
}

function jobRevenue(job: Job): number {
  return job.finalPrice ?? 0;
}

function isActive(job: Job): boolean {
  return job.status !== "Cancelled";
}

function jobYear(job: Job): number {
  return Number(getJobDateOnly(job.jobDate).slice(0, 4));
}

function isInRange(job: Job, start: string, end: string): boolean {
  const date = getJobDateOnly(job.jobDate);
  return date >= start && date <= end;
}

export function computePeriodProfit(jobs: Job[], expenses: Expense[], start: string, end: string) {
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const gross = jobs
    .filter((job) => isActive(job) && isInRange(job, from, to))
    .reduce((sum, job) => sum + jobRevenue(job), 0);
  const expensesTotal = expenses
    .filter((expense) => {
      const date = getJobDateOnly(expense.date);
      return date >= from && date <= to;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  return { gross, expensesTotal, net: gross - expensesTotal };
}

function aggregateJobs(jobs: Job[]): Pick<RevenuePoint, "revenue" | "collected" | "jobs" | "completed"> {
  return {
    revenue: jobs.reduce((sum, job) => sum + jobRevenue(job), 0),
    collected: jobs.filter((job) => job.paid).reduce((sum, job) => sum + jobRevenue(job), 0),
    jobs: jobs.filter(isActive).length,
    completed: jobs.filter((job) => job.status === "Completed").length,
  };
}

function buildStatusCounts(jobs: Job[]): StatusCount[] {
  return JOB_STATUSES.map((status) => ({
    status,
    count: jobs.filter((job) => job.status === status).length,
  }));
}

function buildTopServices(jobs: Job[], limit = 6): ServiceInsight[] {
  const serviceMap = new Map<string, ServiceInsight>();

  for (const job of jobs) {
    const revenueShare =
      job.services.length > 0 ? jobRevenue(job) / job.services.length : jobRevenue(job);
    const services =
      job.services.length > 0 ? job.services : [{ name: "Job", service: undefined, notes: "" }];

    for (const service of services) {
      const name =
        service.name === "Other" && service.customServiceName
          ? service.customServiceName
          : service.name;
      const existing = serviceMap.get(name) ?? { name, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += revenueShare;
      serviceMap.set(name, existing);
    }
  }

  return [...serviceMap.values()]
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, limit);
}


function buildTopCustomers(jobs: Job[], limit = 8): CustomerInsight[] {
  return buildTopCustomersByHousehold(jobs, limit);
}

function getAvailableYears(jobs: Job[]): number[] {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  years.add(currentYear);

  for (const job of jobs) {
    years.add(jobYear(job));
  }

  return [...years].sort((a, b) => b - a);
}

function calendarWeeksOverlappingMonth(year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = endOfMonth(monthStart);
  const weeks: { start: string; end: string }[] = [];
  let cursor = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });

  while (cursor <= monthEnd) {
    weeks.push(calendarWeekRange(cursor));
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

function buildWeeklyBucketsInMonth(
  jobs: Job[],
  year: number,
  month: number
): RevenuePoint[] {
  return calendarWeeksOverlappingMonth(year, month).map(({ start, end }, index) => {
    const bucketJobs = jobs.filter((job) => isInRange(job, start, end));
    const stats = aggregateJobs(bucketJobs);
    const startDate = new Date(`${start}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);

    return {
      key: start,
      weekIndex: index + 1,
      label: formatRangeLabel(start, end),
      shortLabel: format(startDate, startDate.getMonth() === endDate.getMonth() ? "MMM d" : "M/d"),
      startDate: start,
      endDate: end,
      ...stats,
    };
  });
}

function buildDailyBucketsInRange(jobs: Job[], start: string, end: string): RevenuePoint[] {
  const buckets: RevenuePoint[] = [];
  let cursor = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  while (cursor <= endDate) {
    const day = format(cursor, "yyyy-MM-dd");
    const dayJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === day);
    const stats = aggregateJobs(dayJobs);

    buckets.push({
      key: day,
      label: format(cursor, "EEE, MMM d"),
      shortLabel: format(cursor, "EEE"),
      startDate: day,
      endDate: day,
      ...stats,
    });

    cursor = addDays(cursor, 1);
  }

  return buckets;
}

function computeWeekInsights(jobs: Job[], anchor: string): WeekInsights {
  const { start, end } = calendarWeekRange(anchor);
  const weekJobs = jobs.filter((job) => isInRange(job, start, end));
  const activeWeekJobs = weekJobs.filter(isActive);
  const completedWeekJobs = weekJobs.filter((job) => job.status === "Completed");
  const pricedWeekJobs = weekJobs.filter((job) => jobRevenue(job) > 0);
  const pricedCompletedJobs = completedWeekJobs.filter((job) => jobRevenue(job) > 0);

  return {
    label: formatRangeLabel(start, end),
    weekStart: start,
    weekEnd: end,
    revenue: weekJobs.reduce((sum, job) => sum + jobRevenue(job), 0),
    collected: weekJobs.filter((job) => job.paid).reduce((sum, job) => sum + jobRevenue(job), 0),
    outstanding: activeWeekJobs
      .filter((job) => !job.paid && jobRevenue(job) > 0)
      .reduce((sum, job) => sum + jobRevenue(job), 0),
    jobsTotal: weekJobs.length,
    completed: completedWeekJobs.length,
    scheduled: weekJobs.filter((job) => job.status === "Scheduled").length,
    cancelled: weekJobs.filter((job) => job.status === "Cancelled").length,
    paidJobs: weekJobs.filter((job) => job.paid).length,
    averageJobValue:
      pricedWeekJobs.length > 0
        ? pricedWeekJobs.reduce((sum, job) => sum + jobRevenue(job), 0) / pricedWeekJobs.length
        : 0,
    averageCompletedJobValue:
      pricedCompletedJobs.length > 0
        ? pricedCompletedJobs.reduce((sum, job) => sum + jobRevenue(job), 0) /
          pricedCompletedJobs.length
        : 0,
    dailyRevenue: buildDailyBucketsInRange(jobs, start, end),
    statusCounts: buildStatusCounts(weekJobs),
    topServices: buildTopServices(weekJobs),
  };
}

function computeMonthInsights(jobs: Job[], year: number, month: number): MonthInsights {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthDate = new Date(year, month - 1, 1);
  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

  const monthJobs = jobs.filter((job) => isInRange(job, monthStart, monthEnd));
  const activeMonthJobs = monthJobs.filter(isActive);
  const completedMonthJobs = monthJobs.filter((job) => job.status === "Completed");
  const pricedMonthJobs = monthJobs.filter((job) => jobRevenue(job) > 0);
  const pricedCompletedJobs = completedMonthJobs.filter((job) => jobRevenue(job) > 0);

  return {
    year,
    month,
    label: format(monthDate, "MMMM yyyy"),
    revenue: monthJobs.reduce((sum, job) => sum + jobRevenue(job), 0),
    collected: monthJobs.filter((job) => job.paid).reduce((sum, job) => sum + jobRevenue(job), 0),
    outstanding: activeMonthJobs
      .filter((job) => !job.paid && jobRevenue(job) > 0)
      .reduce((sum, job) => sum + jobRevenue(job), 0),
    pipeline: jobs
      .filter(
        (job) =>
          getJobDateOnly(job.jobDate) >= today &&
          job.status === "Scheduled" &&
          jobRevenue(job) > 0
      )
      .reduce((sum, job) => sum + jobRevenue(job), 0),
    jobsTotal: monthJobs.length,
    completed: completedMonthJobs.length,
    scheduled: monthJobs.filter((job) => job.status === "Scheduled").length,
    cancelled: monthJobs.filter((job) => job.status === "Cancelled").length,
    paidJobs: monthJobs.filter((job) => job.paid).length,
    averageJobValue:
      pricedMonthJobs.length > 0
        ? pricedMonthJobs.reduce((sum, job) => sum + jobRevenue(job), 0) / pricedMonthJobs.length
        : 0,
    averageCompletedJobValue:
      pricedCompletedJobs.length > 0
        ? pricedCompletedJobs.reduce((sum, job) => sum + jobRevenue(job), 0) /
          pricedCompletedJobs.length
        : 0,
    statusCounts: buildStatusCounts(monthJobs),
    topServices: buildTopServices(monthJobs),
    weeklyRevenue: buildWeeklyBucketsInMonth(jobs, year, month),
  };
}

function computeYearInsights(jobs: Job[], year: number): YearInsights {
  const yearStart = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
  const yearJobs = jobs.filter((job) => isInRange(job, yearStart, yearEnd));
  const activeYearJobs = yearJobs.filter(isActive);
  const completedYearJobs = yearJobs.filter((job) => job.status === "Completed");
  const pricedYearJobs = yearJobs.filter((job) => jobRevenue(job) > 0);
  const pricedCompletedJobs = completedYearJobs.filter((job) => jobRevenue(job) > 0);

  const revenueTotal = yearJobs.reduce((sum, job) => sum + jobRevenue(job), 0);
  const revenueCollected = yearJobs
    .filter((job) => job.paid)
    .reduce((sum, job) => sum + jobRevenue(job), 0);

  const monthlyRevenue: RevenuePoint[] = MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const monthStart = format(new Date(year, index, 1), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date(year, index, 1)), "yyyy-MM-dd");
    const monthJobs = yearJobs.filter((job) => isInRange(job, monthStart, monthEnd));

    return {
      key: `${year}-${String(month).padStart(2, "0")}`,
      label,
      shortLabel: label,
      startDate: monthStart,
      endDate: monthEnd,
      ...aggregateJobs(monthJobs),
    };
  });

  const quarterlyRevenue: QuarterlyRevenue[] = [1, 2, 3, 4].map((quarter) => {
    const startMonth = (quarter - 1) * 3;
    const months = monthlyRevenue.slice(startMonth, startMonth + 3);

    return {
      quarter,
      label: `Q${quarter}`,
      revenue: months.reduce((sum, month) => sum + month.revenue, 0),
      collected: months.reduce((sum, month) => sum + month.collected, 0),
      jobs: months.reduce((sum, month) => sum + month.jobs, 0),
      completed: months.reduce((sum, month) => sum + month.completed, 0),
    };
  });

  const bestMonthEntry = [...monthlyRevenue].sort((a, b) => b.revenue - a.revenue)[0];
  const bestMonth =
    bestMonthEntry && bestMonthEntry.revenue > 0
      ? { label: bestMonthEntry.label, revenue: bestMonthEntry.revenue }
      : null;

  const priorYearJobs = jobs.filter((job) => jobYear(job) === year - 1);
  const priorYearRevenue =
    priorYearJobs.length > 0
      ? priorYearJobs.reduce((sum, job) => sum + jobRevenue(job), 0)
      : null;
  const yearOverYearChange =
    priorYearRevenue !== null && priorYearRevenue > 0
      ? ((revenueTotal - priorYearRevenue) / priorYearRevenue) * 100
      : null;

  const uniqueCustomers = countUniqueCustomerGroups(yearJobs);

  return {
    year,
    revenueTotal,
    revenueCollected,
    revenueOutstanding: activeYearJobs
      .filter((job) => !job.paid && jobRevenue(job) > 0)
      .reduce((sum, job) => sum + jobRevenue(job), 0),
    jobsTotal: yearJobs.length,
    jobsCompleted: completedYearJobs.length,
    jobsCancelled: yearJobs.filter((job) => job.status === "Cancelled").length,
    uniqueCustomers,
    averageJobValue:
      pricedYearJobs.length > 0
        ? pricedYearJobs.reduce((sum, job) => sum + jobRevenue(job), 0) / pricedYearJobs.length
        : 0,
    averageCompletedJobValue:
      pricedCompletedJobs.length > 0
        ? pricedCompletedJobs.reduce((sum, job) => sum + jobRevenue(job), 0) /
          pricedCompletedJobs.length
        : 0,
    collectionRate: revenueTotal > 0 ? (revenueCollected / revenueTotal) * 100 : 0,
    monthlyRevenue,
    quarterlyRevenue,
    topServices: buildTopServices(yearJobs, 8),
    topCustomers: buildTopCustomers(yearJobs),
    bestMonth,
    priorYearRevenue,
    yearOverYearChange,
    statusCounts: buildStatusCounts(yearJobs),
  };
}

function parseIsoDate(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function formatRangeLabel(start: string, end: string) {
  if (start === end) return format(parseIsoDate(start), "MMM d, yyyy");
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()) {
    return `${format(startDate, "MMM d")}–${format(endDate, "d, yyyy")}`;
  }
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
  }
  return `${format(startDate, "MMM d, yyyy")} – ${format(endDate, "MMM d, yyyy")}`;
}

function buildEveryDayBuckets(jobs: Job[], start: string, end: string): RevenuePoint[] {
  const crossesMonth = start.slice(0, 7) !== end.slice(0, 7);
  const points: RevenuePoint[] = [];
  let cursor = parseIsoDate(start);
  const endDate = parseIsoDate(end);

  while (cursor <= endDate) {
    const day = format(cursor, "yyyy-MM-dd");
    const dayJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === day);
    points.push({
      key: day,
      label: format(cursor, "EEE, MMM d"),
      shortLabel: crossesMonth ? format(cursor, "M/d") : format(cursor, "d"),
      startDate: day,
      endDate: day,
      ...aggregateJobs(dayJobs),
    });
    cursor = addDays(cursor, 1);
  }

  return points;
}

function buildClippedWeekBuckets(jobs: Job[], start: string, end: string): RevenuePoint[] {
  const rangeStart = parseIsoDate(start);
  const rangeEnd = parseIsoDate(end);
  const points: RevenuePoint[] = [];
  let cursor = rangeStart;

  while (cursor <= rangeEnd) {
    const weekStart = max([startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }), rangeStart]);
    const weekEnd = min([endOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }), rangeEnd]);
    const startIso = format(weekStart, "yyyy-MM-dd");
    const endIso = format(weekEnd, "yyyy-MM-dd");
    const bucketJobs = jobs.filter((job) => isInRange(job, startIso, endIso));
    points.push({
      key: startIso,
      label: formatRangeLabel(startIso, endIso),
      shortLabel: format(weekStart, "MMM d"),
      startDate: startIso,
      endDate: endIso,
      ...aggregateJobs(bucketJobs),
    });
    cursor = addDays(weekEnd, 1);
  }

  return points;
}

function buildClippedMonthBuckets(jobs: Job[], start: string, end: string): RevenuePoint[] {
  const rangeStart = parseIsoDate(start);
  const rangeEnd = parseIsoDate(end);

  return eachMonthOfInterval({ start: rangeStart, end: rangeEnd }).map((monthDate) => {
    const bucketStart = max([startOfMonth(monthDate), rangeStart]);
    const bucketEnd = min([endOfMonth(monthDate), rangeEnd]);
    const startIso = format(bucketStart, "yyyy-MM-dd");
    const endIso = format(bucketEnd, "yyyy-MM-dd");
    const bucketJobs = jobs.filter((job) => isInRange(job, startIso, endIso));
    return {
      key: format(monthDate, "yyyy-MM"),
      label: format(monthDate, "MMMM yyyy"),
      shortLabel: format(monthDate, "MMM"),
      startDate: startIso,
      endDate: endIso,
      ...aggregateJobs(bucketJobs),
    };
  });
}

export function computeRangeInsights(jobs: Job[], start: string, end: string): RangeInsights {
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const rangeJobs = jobs.filter((job) => isInRange(job, from, to));
  const activeJobs = rangeJobs.filter(isActive);
  const completedJobs = rangeJobs.filter((job) => job.status === "Completed");
  const pricedJobs = rangeJobs.filter((job) => jobRevenue(job) > 0);
  const span = differenceInCalendarDays(parseIsoDate(to), parseIsoDate(from));
  const buckets =
    span <= 31
      ? buildEveryDayBuckets(rangeJobs, from, to)
      : span <= 180
        ? buildClippedWeekBuckets(rangeJobs, from, to)
        : buildClippedMonthBuckets(rangeJobs, from, to);

  return {
    label: formatRangeLabel(from, to),
    start: from,
    end: to,
    revenue: rangeJobs.reduce((sum, job) => sum + jobRevenue(job), 0),
    collected: rangeJobs.filter((job) => job.paid).reduce((sum, job) => sum + jobRevenue(job), 0),
    outstanding: activeJobs
      .filter((job) => !job.paid && jobRevenue(job) > 0)
      .reduce((sum, job) => sum + jobRevenue(job), 0),
    jobsTotal: rangeJobs.length,
    completed: completedJobs.length,
    scheduled: rangeJobs.filter((job) => job.status === "Scheduled").length,
    cancelled: rangeJobs.filter((job) => job.status === "Cancelled").length,
    paidJobs: rangeJobs.filter((job) => job.paid).length,
    averageJobValue:
      pricedJobs.length > 0
        ? pricedJobs.reduce((sum, job) => sum + jobRevenue(job), 0) / pricedJobs.length
        : 0,
    uniqueCustomers: countUniqueCustomerGroups(rangeJobs),
    statusCounts: buildStatusCounts(rangeJobs),
    topServices: buildTopServices(rangeJobs),
    topCustomers: buildTopCustomers(rangeJobs),
    buckets,
    bucketDescription:
      span <= 31 ? "Each day in the range" : span <= 180 ? "Each week in the range" : "Each month in the range",
  };
}

export function computeBusinessInsights(jobs: Job[], options?: InsightOptions): BusinessInsights {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const year = options?.year ?? now.getFullYear();
  const month = options?.month ?? now.getMonth() + 1;
  const weekAnchor = options?.weekStart ?? today;

  const todayJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === today);
  const tomorrowJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === tomorrow);

  const upcomingJobs = jobs
    .filter(
      (job) =>
        getJobDateOnly(job.jobDate) > tomorrow &&
        job.status !== "Completed" &&
        job.status !== "Cancelled"
    )
    .sort((a, b) => getJobDateOnly(a.jobDate).localeCompare(getJobDateOnly(b.jobDate)))
    .slice(0, 8);

  return {
    availableYears: getAvailableYears(jobs),
    todayJobs,
    tomorrowJobs,
    upcomingJobs,
    needsFollowUpCount: jobs.filter((job) => job.status === "Needs Follow-Up").length,
    unpaidJobsCount: jobs.filter((job) => isActive(job) && !job.paid && jobRevenue(job) > 0).length,
    week: computeWeekInsights(jobs, weekAnchor),
    month: computeMonthInsights(jobs, year, month),
    year: computeYearInsights(jobs, year),
  };
}

/** @deprecated Use computeBusinessInsights */
export function computeDashboardStats(jobs: Job[]) {
  const insights = computeBusinessInsights(jobs);
  return {
    todayJobs: insights.todayJobs,
    tomorrowJobs: insights.tomorrowJobs,
    upcomingJobs: insights.upcomingJobs,
    revenueThisMonth: insights.month.revenue,
    revenueThisWeek: insights.week.revenue,
    revenueCollectedMonth: insights.month.collected,
    revenueOutstandingMonth: insights.month.outstanding,
    revenuePipeline: insights.month.pipeline,
    jobsThisMonth: insights.month.jobsTotal,
    completedThisMonth: insights.month.completed,
    scheduledThisMonth: insights.month.scheduled,
    cancelledThisMonth: insights.month.cancelled,
    needsFollowUpCount: insights.needsFollowUpCount,
    unpaidJobsCount: insights.unpaidJobsCount,
    paidJobsMonth: insights.month.paidJobs,
    averageJobValueMonth: insights.month.averageJobValue,
    averageCompletedJobValue: insights.month.averageCompletedJobValue,
    statusCounts: insights.month.statusCounts,
    topServices: insights.month.topServices,
    weeklyRevenue: insights.month.weeklyRevenue,
  };
}

export { MONTH_LABELS };
