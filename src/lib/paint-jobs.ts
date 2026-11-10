export const PAINT_SERVICE_NAMES = [
  "Kitchen Cabinet Painting & Refinishing",
  "Cabinet Painting + Tile Backsplash Package",
  "Interior Painting",
  "Exterior Painting",
] as const;

export type PaintServiceName = (typeof PAINT_SERVICE_NAMES)[number];

export function normalizeServiceLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const PAINT_NORMALIZED = new Set(PAINT_SERVICE_NAMES.map(normalizeServiceLabel));

export function isPaintServiceLabel(label?: string): boolean {
  const text = normalizeServiceLabel(label ?? "");
  if (!text) return false;
  if (PAINT_NORMALIZED.has(text)) return true;
  if (text.includes("cabinet") || text.includes("backsplash")) return true;
  return text.includes("paint");
}

type NamedService = { name: string; customServiceName?: string };

export function jobServiceLabel(service: NamedService) {
  if (service.name === "Other" && service.customServiceName?.trim()) {
    return service.customServiceName;
  }
  return service.name;
}

export function isPaintService(service: NamedService) {
  return isPaintServiceLabel(jobServiceLabel(service)) || isPaintServiceLabel(service.name);
}

export function jobHasPaintService(job: { services?: NamedService[] }) {
  return (job.services ?? []).some(isPaintService);
}

/** Painting with no wash / window / deck work. */
export function isPaintOnlyJob(job: { services?: NamedService[] }) {
  const services = job.services ?? [];
  if (services.length === 0) return false;
  let hasPaint = false;
  let hasWash = false;
  for (const service of services) {
    if (isPaintService(service)) hasPaint = true;
    else hasWash = true;
  }
  return hasPaint && !hasWash;
}

export function isPaintOnlyLead(lead: { services?: string[] }) {
  const labels = (lead.services ?? []).map((label) => label.trim()).filter(Boolean);
  if (labels.length === 0) return false;
  const hasPaint = labels.some(isPaintServiceLabel);
  const hasWash = labels.some((label) => !isPaintServiceLabel(label));
  return hasPaint && !hasWash;
}

export function paintFeeAmount(price?: number) {
  return Math.round((price ?? 0) * 100 * 0.05) / 100;
}

export function jobPaintFee(job: { services?: NamedService[]; finalPrice?: number }) {
  if (!jobHasPaintService(job)) return 0;
  return paintFeeAmount(job.finalPrice);
}

/** Price that belongs in power-washing totals. Paint-only jobs are $0 here. */
export function powerWashRevenue(job: { services?: NamedService[]; finalPrice?: number }) {
  if (isPaintOnlyJob(job)) return 0;
  return job.finalPrice ?? 0;
}
