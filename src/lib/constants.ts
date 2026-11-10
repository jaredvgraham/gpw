export const JOB_STATUSES = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "Needs Follow-Up",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const DEFAULT_SERVICES = [
  { name: "House wash", description: "Full exterior house washing" },
  { name: "Window cleaning", description: "Window washing" },
  { name: "Roof wash", description: "Soft wash roof cleaning" },
  { name: "Front deck", description: "Front deck cleaning" },
  { name: "Back deck", description: "Back deck cleaning" },
  { name: "Driveway cleaning", description: "Driveway pressure washing" },
  { name: "Patio cleaning", description: "Patio pressure washing" },
  { name: "Walkway cleaning", description: "Walkway pressure washing" },
  { name: "Fence cleaning", description: "Fence pressure washing" },
  { name: "Stone walls", description: "Stone wall pressure washing" },
  { name: "Gutter cleaning", description: "Gutter cleaning and flushing" },
  { name: "Kitchen Cabinet Painting & Refinishing", description: "Cabinet doors, drawers, and frames" },
  { name: "Cabinet Painting + Tile Backsplash Package", description: "Cabinet refinishing plus a new tile backsplash" },
  { name: "Interior Painting", description: "Walls, ceilings, trim, and doors" },
  { name: "Exterior Painting", description: "Siding, trim, decks, and fences" },
  { name: "Other", description: "Custom service" },
] as const;

export const STATUS_COLORS: Record<JobStatus, string> = {
  Scheduled: "#2563eb",
  Completed: "#16a34a",
  Cancelled: "#dc2626",
  "Needs Follow-Up": "#d97706",
};

/** Completed but not collected — yellow, distinct from follow-up amber. */
export const UNPAID_COLOR = "#ca8a04";

export function jobCueColor(job: { status: JobStatus; paid?: boolean }): string {
  if (job.status === "Completed" && !job.paid) return UNPAID_COLOR;
  return STATUS_COLORS[job.status];
}

export function jobCueLabel(job: { status: JobStatus; paid?: boolean }): string {
  if (job.status === "Completed") return job.paid ? "Paid" : "Unpaid";
  return job.status;
}

export function dayCueColor(jobs: { status: JobStatus; paid?: boolean }[]): string | null {
  if (jobs.length === 0) return null;
  if (jobs.some((job) => job.status === "Needs Follow-Up")) return STATUS_COLORS["Needs Follow-Up"];
  if (jobs.some((job) => job.status === "Scheduled")) return STATUS_COLORS.Scheduled;
  if (jobs.some((job) => job.status === "Completed" && !job.paid)) return UNPAID_COLOR;
  if (jobs.some((job) => job.status === "Completed")) return STATUS_COLORS.Completed;
  return STATUS_COLORS.Cancelled;
}
