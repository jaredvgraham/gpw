import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { getJobDateOnly } from "@/lib/dates";
import type { DashboardStats, Job } from "@/types";

export function computeDashboardStats(jobs: Job[]): DashboardStats {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const todayJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === today);
  const tomorrowJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === tomorrow);

  const upcomingJobs = jobs.filter(
    (job) =>
      getJobDateOnly(job.jobDate) > tomorrow &&
      job.status !== "Completed" &&
      job.status !== "Cancelled"
  );

  const completedThisMonth = jobs.filter(
    (job) =>
      job.status === "Completed" &&
      getJobDateOnly(job.jobDate) >= monthStart &&
      getJobDateOnly(job.jobDate) <= monthEnd
  ).length;

  const weekJobs = jobs.filter(
    (job) =>
      getJobDateOnly(job.jobDate) >= weekStart && getJobDateOnly(job.jobDate) <= weekEnd
  );

  const monthJobs = jobs.filter(
    (job) =>
      getJobDateOnly(job.jobDate) >= monthStart && getJobDateOnly(job.jobDate) <= monthEnd
  );

  const estimatedRevenueWeek = weekJobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);
  const estimatedRevenueMonth = monthJobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);

  return {
    todayJobs,
    tomorrowJobs,
    upcomingJobs: upcomingJobs.slice(0, 10),
    completedThisMonth,
    estimatedRevenueWeek,
    estimatedRevenueMonth,
  };
}
