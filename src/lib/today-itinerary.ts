import { format } from "date-fns";
import type { Job } from "@/types";
import { STATUS_COLORS, UNPAID_COLOR } from "@/lib/constants";
import { getJobDateOnly } from "@/lib/dates";
import { getDayTotalMinutes, formatDurationShort, getJobDurationMinutes } from "@/lib/calendar-mobile";
import { timeToMinutes } from "@/lib/job-scheduling";

export function getGapMinutesBetweenJobs(previous: Job, next: Job): number {
  return Math.max(0, timeToMinutes(next.startTime) - timeToMinutes(previous.endTime));
}

export function formatGapLabel(minutes: number): string {
  if (minutes === 0) return "Back to back";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function isJobInProgress(job: Job, dateStr?: string): boolean {
  const today = dateStr ?? format(new Date(), "yyyy-MM-dd");
  if (getJobDateOnly(job.jobDate) !== today) return false;
  if (job.status !== "Scheduled") return false;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const start = timeToMinutes(job.startTime);
  const end = timeToMinutes(job.endTime);
  return nowMinutes >= start && nowMinutes < end;
}

export function getItineraryStatus(job: Job, dateStr?: string) {
  if (isJobInProgress(job, dateStr)) {
    return { label: "IN PROGRESS", color: "#dc2626", highlight: true };
  }

  switch (job.status) {
    case "Completed":
      return job.paid
        ? { label: "PAID", color: STATUS_COLORS.Completed, highlight: false }
        : { label: "UNPAID", color: UNPAID_COLOR, highlight: false };
    case "Cancelled":
      return { label: "CANCELLED", color: "#6b7280", highlight: false };
    case "Needs Follow-Up":
      return { label: "FOLLOW UP", color: STATUS_COLORS["Needs Follow-Up"], highlight: false };
    default:
      return { label: "SCHEDULED", color: STATUS_COLORS.Scheduled, highlight: false };
  }
}

export function getRouteTimeLabel(jobs: Job[]): string {
  const minutes = getDayTotalMinutes(jobs);
  if (minutes === 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

export function getJobDurationLabel(job: Job): string {
  return formatDurationShort(getJobDurationMinutes(job.startTime, job.endTime));
}
