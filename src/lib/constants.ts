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
  { name: "Other", description: "Custom service" },
] as const;

export const STATUS_COLORS: Record<JobStatus, string> = {
  Scheduled: "#2563eb",
  Completed: "#16a34a",
  Cancelled: "#dc2626",
  "Needs Follow-Up": "#d97706",
};
