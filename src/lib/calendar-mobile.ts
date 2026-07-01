import type { Job, JobService } from "@/types";
import { getJobDateOnly } from "@/lib/dates";
import { snapToTimeSlot } from "@/lib/time";
import { getCustomerName } from "@/lib/utils";

const DEFAULT_NEW_JOB_START = "08:00";
const DEFAULT_NEW_JOB_END = "12:00";
const NEW_JOB_GAP_MINUTES = 30;
const DEFAULT_NEW_JOB_DURATION_MINUTES = 240;

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const SERVICE_PILL_STYLES: Record<string, { bg: string; text: string }> = {
  "House wash": { bg: "#dbeafe", text: "#1d4ed8" },
  "Roof wash": { bg: "#fee2e2", text: "#dc2626" },
  "Front deck": { bg: "#ffedd5", text: "#c2410c" },
  "Back deck": { bg: "#fed7aa", text: "#9a3412" },
  "Driveway cleaning": { bg: "#dcfce7", text: "#15803d" },
  "Patio cleaning": { bg: "#f3e8ff", text: "#7e22ce" },
  "Walkway cleaning": { bg: "#e0e7ff", text: "#4338ca" },
  "Fence cleaning": { bg: "#fef3c7", text: "#b45309" },
  "Gutter cleaning": { bg: "#cffafe", text: "#0e7490" },
  Other: { bg: "#f3f4f6", text: "#4b5563" },
};

const DEFAULT_PILL = { bg: "#f3f4f6", text: "#4b5563" };

const SERVICE_PILL_SHORT_LABELS: Record<string, string> = {
  "House wash": "House Wash",
  "Roof wash": "Roof Wash",
  "Front deck": "Front Deck",
  "Back deck": "Back Deck",
  "Driveway cleaning": "Driveway",
  "Patio cleaning": "Patio",
  "Walkway cleaning": "Walkway",
  "Fence cleaning": "Fence",
  "Gutter cleaning": "Gutters",
};

function normalizeServiceName(serviceName: string) {
  const trimmed = serviceName.trim();
  const match = Object.keys(SERVICE_PILL_STYLES).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase()
  );
  return match ?? trimmed;
}

export function formatServicePillLabel(label: string, serviceName?: string) {
  const key = serviceName ? normalizeServiceName(serviceName) : label;
  return SERVICE_PILL_SHORT_LABELS[key] ?? label;
}

export function getServicePillStyle(serviceName: string) {
  const key = normalizeServiceName(serviceName);
  return SERVICE_PILL_STYLES[key] ?? DEFAULT_PILL;
}

export function getServiceLabelForEntry(service: JobService): string {
  if (service.name === "Other" && service.customServiceName) return service.customServiceName;
  return service.name;
}

export function getJobServiceEntries(job: Job) {
  return job.services.map((service) => ({
    label: getServiceLabelForEntry(service),
    serviceName: service.name,
  }));
}

export function getJobCellLabel(job: Job): string {
  const name = getCustomerName(job);
  if (name !== "Unknown Customer") return name;
  const primary = job.services[0];
  if (!primary) return "Job";
  return getServiceLabelForEntry(primary);
}

export function getServiceLabel(job: Job): string {
  const primary = job.services[0];
  if (!primary) return "Job";
  return getServiceLabelForEntry(primary);
}

export function getJobsForDate(jobs: Job[], dateStr: string) {
  return jobs
    .filter((job) => getJobDateOnly(job.jobDate) === dateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** Default start/end when creating a job on a day that may already have jobs. */
export function getNewJobTimePrefill(jobs: Job[], dateStr: string) {
  const dayJobs = getJobsForDate(jobs, dateStr);
  if (dayJobs.length === 0) {
    return { startTime: DEFAULT_NEW_JOB_START, endTime: DEFAULT_NEW_JOB_END };
  }

  const latestEnd = dayJobs.reduce(
    (latest, job) => (job.endTime > latest ? job.endTime : latest),
    dayJobs[0].endTime
  );
  const startTime = snapToTimeSlot(addMinutesToTime(latestEnd, NEW_JOB_GAP_MINUTES));
  const endTime = snapToTimeSlot(
    addMinutesToTime(startTime, DEFAULT_NEW_JOB_DURATION_MINUTES)
  );

  return { startTime, endTime };
}

export function getDayRevenue(jobs: Job[]) {
  return jobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);
}

export function getJobDurationMinutes(startTime: string, endTime: string) {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return endH * 60 + endM - (startH * 60 + startM);
}

export function getDayTotalMinutes(jobs: Job[]) {
  return jobs.reduce((sum, job) => sum + getJobDurationMinutes(job.startTime, job.endTime), 0);
}

export function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDurationShort(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

export function formatJobDurationEst(startTime: string, endTime: string) {
  return `Est. ${formatDurationShort(getJobDurationMinutes(startTime, endTime))}`;
}
