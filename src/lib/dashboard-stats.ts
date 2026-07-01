import {
  addDays,
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { getJobDateOnly } from "@/lib/dates";
import { getCustomerName } from "@/lib/utils";
import { JOB_STATUSES, type JobStatus } from "@/lib/constants";
import { buildTopCustomersByHousehold, buildHouseholdIndex } from "@/lib/household-display";
import type { CustomerInsight } from "@/lib/household-display";
import type { Customer, Job } from "@/types";

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
  weekIndex: number;
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

export interface InsightOptions {
  year?: number;
  month?: number;
  monthWeek?: number;
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
export const WEEKS_PER_MONTH = 4;
const MONTH_WEEK_START_DAYS = [1, 8, 15, 22] as const;
const MONTH_WEEK_END_DAYS = [7, 14, 21] as const;

function isWorkingDay(dateStr: string): boolean {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  return day >= 1 && day <= 5;
}

function isJobOnWorkingDay(job: Job): boolean {
  return isWorkingDay(getJobDateOnly(job.jobDate));
}

export function getMonthWeekIndex(dateStr: string): number {
  const day = Number(getJobDateOnly(dateStr).slice(8, 10));
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export function getMonthWeekRange(year: number, month: number, weekIndex: number) {
  const lastDay = endOfMonth(new Date(year, month - 1, 1)).getDate();
  const startDay = MONTH_WEEK_START_DAYS[weekIndex - 1];
  const endDay = weekIndex === WEEKS_PER_MONTH ? lastDay : MONTH_WEEK_END_DAYS[weekIndex - 1];

  return {
    start: format(new Date(year, month - 1, startDay), "yyyy-MM-dd"),
    end: format(new Date(year, month - 1, endDay), "yyyy-MM-dd"),
  };
}

function countWorkingDaysInRange(start: string, end: string): number {
  let count = 0;
  let cursor = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  while (cursor <= endDate) {
    if (isWorkingDay(format(cursor, "yyyy-MM-dd"))) count += 1;
    cursor = addDays(cursor, 1);
  }

  return count;
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

function buildWeeklyBucketsInMonth(
  jobs: Job[],
  year: number,
  month: number
): RevenuePoint[] {
  const monthStart = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");
  const monthJobs = jobs.filter((job) => isInRange(job, monthStart, monthEnd));

  return Array.from({ length: WEEKS_PER_MONTH }, (_, index) => {
    const weekIndex = index + 1;
    const { start, end } = getMonthWeekRange(year, month, weekIndex);
    const workingDays = countWorkingDaysInRange(start, end);
    const bucketJobs = monthJobs.filter(
      (job) => isInRange(job, start, end) && isJobOnWorkingDay(job)
    );
    const stats = aggregateJobs(bucketJobs);
    const startDate = new Date(`${start}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);

    return {
      key: `${year}-${String(month).padStart(2, "0")}-w${weekIndex}`,
      weekIndex,
      label: `Week ${weekIndex} · ${format(startDate, "MMM d")}–${format(endDate, "MMM d")}`,
      shortLabel: `W${weekIndex}`,
      startDate: start,
      endDate: end,
      workingDays,
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

    if (isWorkingDay(day)) {
      const dayJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === day);
      const stats = aggregateJobs(dayJobs);
      const dayDate = new Date(`${day}T12:00:00`);

      buckets.push({
        key: day,
        label: format(dayDate, "EEE"),
        shortLabel: format(dayDate, "d"),
        startDate: day,
        endDate: day,
        workingDays: 1,
        ...stats,
      });
    }

    cursor = addDays(cursor, 1);
  }

  return buckets;
}

function computeWeekInsights(
  jobs: Job[],
  year: number,
  month: number,
  monthWeek: number
): WeekInsights {
  const { start, end } = getMonthWeekRange(year, month, monthWeek);
  const weekJobs = jobs.filter((job) => isInRange(job, start, end) && isJobOnWorkingDay(job));
  const activeWeekJobs = weekJobs.filter(isActive);
  const completedWeekJobs = weekJobs.filter((job) => job.status === "Completed");
  const pricedWeekJobs = weekJobs.filter((job) => jobRevenue(job) > 0);
  const pricedCompletedJobs = completedWeekJobs.filter((job) => jobRevenue(job) > 0);

  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  return {
    label: `Week ${monthWeek} · ${format(startDate, "MMM d")}–${format(endDate, "MMM d, yyyy")}`,
    weekIndex: monthWeek,
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

export function computeBusinessInsights(jobs: Job[], options?: InsightOptions): BusinessInsights {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const year = options?.year ?? now.getFullYear();
  const month = options?.month ?? now.getMonth() + 1;
  const monthWeek = options?.monthWeek ?? getMonthWeekIndex(today);

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
    week: computeWeekInsights(jobs, year, month, monthWeek),
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
