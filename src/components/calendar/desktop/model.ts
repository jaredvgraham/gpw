import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Job } from "@/types";
import type { JobStatus } from "@/lib/constants";
import { getJobDateOnly } from "@/lib/dates";
import { formatTime, getJobAddress } from "@/lib/utils";

export type DesktopView = "listDay" | "timeGridWeek" | "dayGridMonth" | "multiMonthYear";

/** Soft status washes. Dark ink stays readable on the tint. */
export const STATUS_SURFACE: Record<
  JobStatus,
  { bg: string; border: string; accent: string; ink: string; muted: string }
> = {
  Scheduled: { bg: "#eff6ff", border: "#bfdbfe", accent: "#2563eb", ink: "#1e3a8a", muted: "#1d4ed8" },
  Completed: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#16a34a", ink: "#14532d", muted: "#15803d" },
  Cancelled: { bg: "#fef2f2", border: "#fecaca", accent: "#dc2626", ink: "#7f1d1d", muted: "#b91c1c" },
  "Needs Follow-Up": { bg: "#fffbeb", border: "#fde68a", accent: "#d97706", ink: "#78350f", muted: "#b45309" },
};

export const DESKTOP_VIEWS: { view: DesktopView; label: string }[] = [
  { view: "listDay", label: "Day" },
  { view: "timeGridWeek", label: "Week" },
  { view: "dayGridMonth", label: "Month" },
  { view: "multiMonthYear", label: "Year" },
];

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function jobsOnDate(jobs: Job[], date: Date) {
  const iso = toIsoDate(date);
  return jobs
    .filter((job) => getJobDateOnly(job.jobDate) === iso)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function jobsBetween(jobs: Job[], start: Date, end: Date) {
  const from = toIsoDate(startOfDay(start));
  const to = toIsoDate(startOfDay(end));
  return jobs.filter((job) => {
    const iso = getJobDateOnly(job.jobDate);
    return iso >= from && iso <= to;
  });
}

export function monthGridDays(cursor: Date) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function viewInterval(view: DesktopView, cursor: Date) {
  if (view === "dayGridMonth") {
    return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
  }
  if (view === "multiMonthYear") {
    return {
      start: new Date(cursor.getFullYear(), 0, 1),
      end: new Date(cursor.getFullYear(), 11, 31),
    };
  }
  if (view === "timeGridWeek") {
    return {
      start: startOfWeek(cursor, { weekStartsOn: 0 }),
      end: endOfWeek(cursor, { weekStartsOn: 0 }),
    };
  }
  return { start: cursor, end: cursor };
}

export function jobServiceLabel(job: Job) {
  return job.services
    .map((service) =>
      service.name === "Other" && service.customServiceName ? service.customServiceName : service.name
    )
    .filter(Boolean)
    .join(", ");
}

export function jobTown(job: Job) {
  if (typeof job.customer === "object" && job.customer !== null) {
    return job.customer.city?.trim() || "";
  }
  return "";
}

export function jobPlaceLine(job: Job) {
  const town = jobTown(job);
  const services = jobServiceLabel(job);
  return [town, services].filter(Boolean).join(" · ");
}

export function bookedTotal(jobs: Job[]) {
  return jobs.reduce((sum, job) => {
    if (job.status === "Cancelled") return sum;
    return sum + (job.finalPrice ?? 0);
  }, 0);
}

export function dueTotal(jobs: Job[]) {
  return jobs.reduce((sum, job) => {
    if (job.status !== "Completed" || job.paid) return sum;
    return sum + (job.finalPrice ?? 0);
  }, 0);
}

export function formatTimeRange(start: string, end: string) {
  const startLabel = formatTime(start);
  const endLabel = formatTime(end);
  const startPeriod = startLabel.slice(-2);
  const endPeriod = endLabel.slice(-2);
  if (startPeriod === endPeriod) {
    return `${startLabel.slice(0, -3)}–${endLabel}`;
  }
  return `${startLabel} – ${endLabel}`;
}

export function jobStatusMark(job: Job): { label: string; tone: "good" | "alert" | "muted" | "bad" } | null {
  if (job.status === "Cancelled") return { label: "Cancelled", tone: "bad" };
  if (job.status === "Needs Follow-Up") return { label: "Follow up", tone: "alert" };
  if (job.status === "Completed" && job.paid) return { label: "Paid", tone: "good" };
  if (job.status === "Completed") return { label: "Due", tone: "alert" };
  if (job.paid) return { label: "Paid", tone: "good" };
  return null;
}

export function yearDaySignal(jobs: Job[]): JobStatus | null {
  if (jobs.length === 0) return null;
  if (jobs.some((job) => job.status === "Needs Follow-Up")) return "Needs Follow-Up";
  if (jobs.some((job) => job.status === "Scheduled")) return "Scheduled";
  if (jobs.some((job) => job.status === "Completed")) return "Completed";
  return "Cancelled";
}

export function jobSummary(job: Job, name: string) {
  const when = formatTimeRange(job.startTime, job.endTime);
  const place = getJobAddress(job);
  const services = jobServiceLabel(job);
  const price = job.finalPrice !== undefined ? `$${job.finalPrice}` : "";
  return [name, when, place, services, price, job.status].filter(Boolean).join(", ");
}
