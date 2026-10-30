import { addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { getJobDateOnly } from "@/lib/dates";
import { AD_SOURCE_BUCKETS, leadSourceBucket } from "@/lib/owner-metrics";
import { bookingAddressKey } from "@/lib/owner-metrics";
import type { Expense, Job, Lead } from "@/types";

/** Average month, in days. Period totals are scaled to this so every number reads "per month". */
export const MONTH_DAYS = 30.44;

export type LeverId =
  | "adSpend"
  | "cpl"
  | "organicLeads"
  | "closeRate"
  | "repeatJobs"
  | "workDays"
  | "hoursPerDay"
  | "hoursPerJob"
  | "ticket"
  | "materialsPerJob"
  | "fixedCosts";

export type Levers = Record<LeverId, number>;

export type NodeId =
  | "adSpend"
  | "adLeads"
  | "leads"
  | "demand"
  | "capacity"
  | "jobs"
  | "revenue"
  | "materials"
  | "expenses"
  | "net"
  | "perOwner";

export interface Outputs {
  adSpend: number;
  adLeads: number;
  organicLeads: number;
  leads: number;
  demand: number;
  capacity: number;
  jobs: number;
  turnedAway: number;
  utilization: number;
  revenue: number;
  materials: number;
  fixed: number;
  expenses: number;
  net: number;
  perOwner: number;
  margin: number;
  contribution: number;
  breakEvenJobs: number;
  /** Net change from spending one more $100 on ads this month. */
  marginalPer100: number;
  roas: number | null;
  cac: number | null;
  hoursWorked: number;
}

export type LeverKind = "money" | "count" | "percent" | "hours" | "days";

export interface LeverMeta {
  id: LeverId;
  label: string;
  short: string;
  kind: LeverKind;
  min: number;
  max: number;
  step: number;
  /** Which node this dial is attached to in the stage. */
  slot: "marketing" | "toLeads" | "toJobs" | "jobs" | "toRevenue" | "toProfit";
  hint: string;
}

export const LEVERS: LeverMeta[] = [
  {
    id: "adSpend",
    label: "Ad spend",
    short: "Ads",
    kind: "money",
    min: 0,
    max: 12000,
    step: 50,
    slot: "marketing",
    hint: "Monthly paid advertising. Buys leads at the cost per lead.",
  },
  {
    id: "cpl",
    label: "Cost per lead",
    short: "CPL",
    kind: "money",
    min: 5,
    max: 250,
    step: 1,
    slot: "toLeads",
    hint: "What one paid inquiry costs. Lower means ads convert to inquiries more efficiently.",
  },
  {
    id: "organicLeads",
    label: "Organic leads",
    short: "Organic",
    kind: "count",
    min: 0,
    max: 120,
    step: 1,
    slot: "toLeads",
    hint: "Inquiries that arrive without ad spend: Google, referrals, yard signs, the truck.",
  },
  {
    id: "closeRate",
    label: "Close rate",
    short: "Close",
    kind: "percent",
    min: 0.02,
    max: 1,
    step: 0.01,
    slot: "toJobs",
    hint: "Share of inquiries that become a booked job.",
  },
  {
    id: "repeatJobs",
    label: "Repeat jobs",
    short: "Repeat",
    kind: "count",
    min: 0,
    max: 120,
    step: 1,
    slot: "toJobs",
    hint: "Jobs from houses already served. They arrive without a new inquiry.",
  },
  {
    id: "workDays",
    label: "Work days",
    short: "Days",
    kind: "days",
    min: 0,
    max: 30,
    step: 1,
    slot: "jobs",
    hint: "Days per month the crew is out.",
  },
  {
    id: "hoursPerDay",
    label: "Hours per day",
    short: "Hrs/day",
    kind: "hours",
    min: 1,
    max: 14,
    step: 0.5,
    slot: "jobs",
    hint: "Billable hours available on a work day.",
  },
  {
    id: "hoursPerJob",
    label: "Hours per job",
    short: "Hrs/job",
    kind: "hours",
    min: 0.5,
    max: 8,
    step: 0.25,
    slot: "jobs",
    hint: "Average time a job occupies the crew.",
  },
  {
    id: "ticket",
    label: "Average ticket",
    short: "Ticket",
    kind: "money",
    min: 100,
    max: 2500,
    step: 5,
    slot: "toRevenue",
    hint: "Average price of a job.",
  },
  {
    id: "materialsPerJob",
    label: "Materials per job",
    short: "Materials",
    kind: "money",
    min: 0,
    max: 400,
    step: 1,
    slot: "toProfit",
    hint: "Gas and bleach consumed by one job.",
  },
  {
    id: "fixedCosts",
    label: "Fixed costs",
    short: "Fixed",
    kind: "money",
    min: 0,
    max: 8000,
    step: 25,
    slot: "toProfit",
    hint: "Equipment, supplies, and other costs that do not move with job count.",
  },
];

export const LEVER_BY_ID: Record<LeverId, LeverMeta> = Object.fromEntries(
  LEVERS.map((lever) => [lever.id, lever])
) as Record<LeverId, LeverMeta>;

/** Nodes in causal order. A trace walks this list. */
export const NODE_ORDER: NodeId[] = [
  "adSpend",
  "adLeads",
  "leads",
  "demand",
  "capacity",
  "jobs",
  "revenue",
  "materials",
  "expenses",
  "net",
  "perOwner",
];

export const NODE_LABEL: Record<NodeId, string> = {
  adSpend: "Ad spend",
  adLeads: "Paid leads",
  leads: "Leads",
  demand: "Demand",
  capacity: "Capacity",
  jobs: "Jobs",
  revenue: "Revenue",
  materials: "Materials",
  expenses: "Expenses",
  net: "Net profit",
  perOwner: "Each owner",
};

/** Everything downstream of each lever, in causal order. */
export const LEVER_DOWNSTREAM: Record<LeverId, NodeId[]> = {
  adSpend: ["adSpend", "adLeads", "leads", "demand", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  cpl: ["adLeads", "leads", "demand", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  organicLeads: ["leads", "demand", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  closeRate: ["demand", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  repeatJobs: ["demand", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  workDays: ["capacity", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  hoursPerDay: ["capacity", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  hoursPerJob: ["capacity", "jobs", "revenue", "materials", "expenses", "net", "perOwner"],
  ticket: ["revenue", "net", "perOwner"],
  materialsPerJob: ["materials", "expenses", "net", "perOwner"],
  fixedCosts: ["expenses", "net", "perOwner"],
};

export function runModel(levers: Levers, demandMultiplier = 1): Outputs {
  const m = Math.max(0, demandMultiplier);
  const adLeads = levers.cpl > 0 ? (levers.adSpend / levers.cpl) * m : 0;
  const organicLeads = levers.organicLeads * m;
  const leads = adLeads + organicLeads;
  const repeat = levers.repeatJobs * m;
  const demand = leads * levers.closeRate + repeat;
  const capacity = levers.hoursPerJob > 0 ? (levers.workDays * levers.hoursPerDay) / levers.hoursPerJob : 0;
  const jobs = Math.min(demand, capacity);
  const turnedAway = Math.max(0, demand - capacity);
  const revenue = jobs * levers.ticket;
  const materials = jobs * levers.materialsPerJob;
  const fixed = levers.fixedCosts;
  const expenses = levers.adSpend + materials + fixed;
  const net = revenue - expenses;
  const contribution = levers.ticket - levers.materialsPerJob;
  const breakEvenJobs = contribution > 0 ? (levers.adSpend + fixed) / contribution : Number.POSITIVE_INFINITY;
  const underCapacity = demand < capacity - 1e-9;
  const marginalPer100 =
    underCapacity && levers.cpl > 0
      ? Math.min(
          (100 / levers.cpl) * m * levers.closeRate,
          Math.max(0, capacity - demand)
        ) * contribution - 100
      : -100;
  const paidJobs = adLeads * levers.closeRate;
  const roas = levers.adSpend > 0 ? (Math.min(paidJobs, jobs) * levers.ticket) / levers.adSpend : null;
  const cac = paidJobs > 0 ? levers.adSpend / paidJobs : null;

  return {
    adSpend: levers.adSpend,
    adLeads,
    organicLeads,
    leads,
    demand,
    capacity,
    jobs,
    turnedAway,
    utilization: capacity > 0 ? jobs / capacity : 0,
    revenue,
    materials,
    fixed,
    expenses,
    net,
    perOwner: net / 2,
    margin: revenue > 0 ? net / revenue : 0,
    contribution,
    breakEvenJobs,
    marginalPer100,
    roas,
    cac,
    hoursWorked: jobs * levers.hoursPerJob,
  };
}

export const NODE_VALUE: Record<NodeId, (o: Outputs) => number> = {
  adSpend: (o) => o.adSpend,
  adLeads: (o) => o.adLeads,
  leads: (o) => o.leads,
  demand: (o) => o.demand,
  capacity: (o) => o.capacity,
  jobs: (o) => o.jobs,
  revenue: (o) => o.revenue,
  materials: (o) => o.materials,
  expenses: (o) => o.expenses,
  net: (o) => o.net,
  perOwner: (o) => o.perOwner,
};

export const NODE_KIND: Record<NodeId, LeverKind> = {
  adSpend: "money",
  adLeads: "count",
  leads: "count",
  demand: "count",
  capacity: "count",
  jobs: "count",
  revenue: "money",
  materials: "money",
  expenses: "money",
  net: "money",
  perOwner: "money",
};

// ---------------------------------------------------------------------------
// Baseline: the business as it actually ran over a period, normalised per month
// ---------------------------------------------------------------------------

export type BasePeriodId = "month" | "30d" | "90d" | "year";

export const BASE_PERIODS: { id: BasePeriodId; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "year", label: "This year" },
];

export function basePeriodRange(id: BasePeriodId, now = new Date()): { from: string; to: string } {
  const today = format(now, "yyyy-MM-dd");
  switch (id) {
    case "month":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: today };
    case "30d":
      return { from: format(new Date(now.getTime() - 29 * 86400000), "yyyy-MM-dd"), to: today };
    case "90d":
      return { from: format(new Date(now.getTime() - 89 * 86400000), "yyyy-MM-dd"), to: today };
    case "year":
      return { from: `${now.getFullYear()}-01-01`, to: today };
  }
}

export interface Baseline {
  from: string;
  to: string;
  days: number;
  /** Period totals → per-month factor. */
  factor: number;
  levers: Levers;
  /** Raw period facts, before normalisation. Shown so the owner can see where a default came from. */
  facts: {
    jobs: number;
    gross: number;
    expenses: number;
    leads: number;
    adLeads: number;
    firstTimeJobs: number;
    repeatJobs: number;
    workDays: number;
    hoursPerWorkDay: number;
  };
  /** Which defaults had to fall back to an assumption because the period lacked data. */
  assumed: LeverId[];
}

function isActive(job: Job) {
  return job.status !== "Cancelled";
}

function jobHours(job: Job): number {
  const [sh, sm] = job.startTime.split(":").map(Number);
  const [eh, em] = job.endTime.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
}

function houseKey(job: Job): string | null {
  const customer = typeof job.customer === "object" && job.customer !== null ? job.customer : null;
  if (!customer) return null;
  const address = bookingAddressKey(customer.streetAddress, customer.city);
  return address ? `addr:${address}` : `id:${customer._id}`;
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function deriveBaseline(jobs: Job[], leads: Lead[], expenses: Expense[], from: string, to: string): Baseline {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const days = Math.max(1, differenceInCalendarDays(new Date(`${end}T12:00:00`), new Date(`${start}T12:00:00`)) + 1);
  const factor = MONTH_DAYS / days;
  const inRange = (date: string) => date >= start && date <= end;
  const assumed: LeverId[] = [];

  const periodJobs = jobs.filter((job) => isActive(job) && inRange(getJobDateOnly(job.jobDate)));
  const priced = periodJobs.filter((job) => (job.finalPrice ?? 0) > 0);
  const gross = periodJobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);

  // First-time vs repeat houses, judged against the full job history.
  const seen = new Set<string>();
  let firstTimeJobs = 0;
  let repeatJobs = 0;
  for (const job of [...jobs]
    .filter(isActive)
    .sort((a, b) => getJobDateOnly(a.jobDate).localeCompare(getJobDateOnly(b.jobDate)))) {
    const key = houseKey(job);
    const repeat = key ? seen.has(key) : false;
    if (key) seen.add(key);
    if (!inRange(getJobDateOnly(job.jobDate))) continue;
    if (repeat) repeatJobs += 1;
    else firstTimeJobs += 1;
  }

  const periodLeads = leads.filter((lead) => lead.source !== "phone" && inRange(getJobDateOnly(lead.createdAt)));
  const adLeadCount = periodLeads.filter((lead) => AD_SOURCE_BUCKETS.has(leadSourceBucket(lead))).length;
  const organicCount = periodLeads.length - adLeadCount;

  const periodExpenses = expenses.filter((expense) => inRange(getJobDateOnly(expense.date)));
  const sumType = (...types: string[]) =>
    periodExpenses.filter((e) => types.includes(e.type)).reduce((sum, e) => sum + e.amount, 0);
  const ads = sumType("Ads");
  const materialsTotal = sumType("Gas", "Bleach");
  const fixedTotal = sumType("Equipment", "Supplies", "Other");
  const expensesTotal = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const workDaySet = new Set(periodJobs.map((job) => getJobDateOnly(job.jobDate)));
  const totalHours = periodJobs.reduce((sum, job) => sum + jobHours(job), 0);

  let ticket = priced.length > 0 ? gross / priced.length : 450;
  if (priced.length === 0) assumed.push("ticket");
  ticket = roundTo(ticket, 5);

  let hoursPerJob = periodJobs.length > 0 ? totalHours / periodJobs.length : 1.5;
  if (periodJobs.length === 0) assumed.push("hoursPerJob");
  hoursPerJob = Math.min(8, Math.max(0.5, roundTo(hoursPerJob, 0.25)));

  let workDays = Math.round(workDaySet.size * factor);
  if (workDaySet.size === 0) {
    workDays = 20;
    assumed.push("workDays");
  }
  workDays = Math.min(30, Math.max(0, workDays));

  // Capacity is a choice, not a measurement: a full day is assumed to be 8 hours.
  const hoursPerDay = 8;
  assumed.push("hoursPerDay");

  const adSpend = roundTo(ads * factor, 50);
  let cpl = adLeadCount > 0 && ads > 0 ? ads / adLeadCount : 45;
  if (!(adLeadCount > 0 && ads > 0)) assumed.push("cpl");
  cpl = Math.min(250, Math.max(5, Math.round(cpl)));

  const organicLeads = Math.round(organicCount * factor);

  // Lead tracking is young, so the close rate is estimated from first-time jobs over inquiries.
  let closeRate = periodLeads.length > 0 ? firstTimeJobs / periodLeads.length : 0.3;
  if (periodLeads.length === 0) assumed.push("closeRate");
  closeRate = Math.min(1, Math.max(0.02, roundTo(closeRate, 0.01)));

  const repeat = Math.round(repeatJobs * factor);

  const completed = periodJobs.filter((job) => job.status === "Completed").length;
  let materialsPerJob = completed > 0 && materialsTotal > 0 ? materialsTotal / completed : 25;
  if (!(completed > 0 && materialsTotal > 0)) assumed.push("materialsPerJob");
  materialsPerJob = Math.min(400, Math.max(0, Math.round(materialsPerJob)));

  const fixedCosts = roundTo(fixedTotal * factor, 25);

  return {
    from: start,
    to: end,
    days,
    factor,
    levers: {
      adSpend,
      cpl,
      organicLeads,
      closeRate,
      repeatJobs: repeat,
      workDays,
      hoursPerDay,
      hoursPerJob,
      ticket,
      materialsPerJob,
      fixedCosts,
    },
    facts: {
      jobs: periodJobs.length,
      gross,
      expenses: expensesTotal,
      leads: periodLeads.length,
      adLeads: adLeadCount,
      firstTimeJobs,
      repeatJobs,
      workDays: workDaySet.size,
      hoursPerWorkDay: workDaySet.size > 0 ? totalHours / workDaySet.size : 0,
    },
    assumed,
  };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface HistoryMonth {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  net: number;
  jobs: number;
}

export function actualMonths(jobs: Job[], expenses: Expense[], count: number, now = new Date()): HistoryMonth[] {
  const months: HistoryMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const from = format(startOfMonth(date), "yyyy-MM-dd");
    const to = format(endOfMonth(date), "yyyy-MM-dd");
    const monthJobs = jobs.filter((job) => isActive(job) && getJobDateOnly(job.jobDate) >= from && getJobDateOnly(job.jobDate) <= to);
    const revenue = monthJobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);
    const spent = expenses
      .filter((e) => getJobDateOnly(e.date) >= from && getJobDateOnly(e.date) <= to)
      .reduce((sum, e) => sum + e.amount, 0);
    months.push({
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM"),
      revenue,
      expenses: spent,
      net: revenue - spent,
      jobs: monthJobs.length,
    });
  }
  return months;
}

export interface FutureMonth {
  key: string;
  label: string;
  year: number;
  /** Zero-based calendar month. */
  month: number;
}

export function futureMonths(count: number, now = new Date()): FutureMonth[] {
  const list: FutureMonth[] = [];
  for (let i = 1; i <= count; i++) {
    const date = addMonths(startOfMonth(now), i);
    list.push({ key: format(date, "yyyy-MM"), label: format(date, "MMM"), year: date.getFullYear(), month: date.getMonth() });
  }
  return list;
}

/** A New England exterior-cleaning year. Index is the calendar month, zero-based. */
export const SEASON_CURVE = [0.25, 0.25, 0.5, 0.9, 1.2, 1.3, 1.2, 1.1, 1.1, 1.0, 0.6, 0.35];

// ---------------------------------------------------------------------------
// Explaining a change
// ---------------------------------------------------------------------------

export interface TraceStep {
  node: NodeId;
  before: number;
  after: number;
  reason: string;
  /** True when the value did not move even though an input did. */
  blocked?: boolean;
}

export function reasonFor(node: NodeId, levers: Levers, o: Outputs, multiplier: number): string {
  const season = multiplier !== 1 ? ` · ×${multiplier.toFixed(2)} season` : "";
  switch (node) {
    case "adSpend":
      return "Set directly";
    case "adLeads":
      return `${money(levers.adSpend)} ÷ ${money(levers.cpl)} per lead${season}`;
    case "leads":
      return `${num(o.adLeads)} paid + ${num(o.organicLeads)} organic`;
    case "demand":
      return `${num(o.leads)} leads × ${pct(levers.closeRate)} + ${num(levers.repeatJobs * multiplier)} repeat`;
    case "capacity":
      return `${levers.workDays} days × ${levers.hoursPerDay}h ÷ ${levers.hoursPerJob}h per job`;
    case "jobs":
      return o.turnedAway > 0.5
        ? `Capped at capacity · ${num(o.turnedAway)} jobs turned away`
        : `All ${num(o.demand)} demanded jobs fit · ${Math.round(o.utilization * 100)}% of capacity`;
    case "revenue":
      return `${num(o.jobs)} jobs × ${money(levers.ticket)}`;
    case "materials":
      return `${num(o.jobs)} jobs × ${money(levers.materialsPerJob)}`;
    case "expenses":
      return `${money(o.adSpend)} ads + ${money(o.materials)} materials + ${money(o.fixed)} fixed`;
    case "net":
      return `${money(o.revenue)} − ${money(o.expenses)}`;
    case "perOwner":
      return `${money(o.net)} ÷ 2`;
  }
}

export function trace(lever: LeverId, before: Outputs, after: Outputs, levers: Levers, multiplier: number): TraceStep[] {
  const steps: TraceStep[] = [];
  for (const node of LEVER_DOWNSTREAM[lever]) {
    const b = NODE_VALUE[node](before);
    const a = NODE_VALUE[node](after);
    const kind = NODE_KIND[node];
    const eps = kind === "money" ? 0.5 : 0.05;
    const moved = Math.abs(a - b) > eps;
    if (!moved && node !== "jobs") continue;
    if (!moved && node === "jobs") {
      // Demand moved but jobs did not: the crew is the ceiling. Say so, then stop.
      const demandMoved = Math.abs(after.demand - before.demand) > 0.05;
      if (!demandMoved) continue;
      steps.push({ node, before: b, after: a, reason: reasonFor(node, levers, after, multiplier), blocked: true });
      break;
    }
    steps.push({ node, before: b, after: a, reason: reasonFor(node, levers, after, multiplier) });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Formatting (compact, mono-friendly)
// ---------------------------------------------------------------------------

export function money(value: number, opts: { sign?: boolean; compact?: boolean } = {}): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  let body: string;
  if (opts.compact && abs >= 10000) {
    body = `$${(abs / 1000).toFixed(abs >= 100000 ? 0 : 1)}k`;
  } else {
    body = `$${Math.round(abs).toLocaleString("en-US")}`;
  }
  if (value < -0.5) return `−${body}`;
  if (opts.sign && value > 0.5) return `+${body}`;
  return body;
}

export function num(value: number, opts: { sign?: boolean; decimals?: number } = {}): string {
  if (!Number.isFinite(value)) return "—";
  const decimals = opts.decimals ?? (Math.abs(value) < 10 && Math.abs(value) % 1 > 0.05 ? 1 : 0);
  const abs = Math.abs(value).toFixed(decimals);
  if (value < 0 && Number(abs) !== 0) return `−${abs}`;
  if (opts.sign && value > 0 && Number(abs) !== 0) return `+${abs}`;
  return abs;
}

export function pct(value: number, opts: { sign?: boolean } = {}): string {
  if (!Number.isFinite(value)) return "—";
  const p = value * 100;
  const body = `${Math.abs(p).toFixed(Math.abs(p) < 10 ? 1 : 0)}%`;
  if (p < 0) return `−${body}`;
  if (opts.sign && p > 0) return `+${body}`;
  return body;
}

export function formatKind(kind: LeverKind, value: number, opts: { sign?: boolean; compact?: boolean } = {}): string {
  switch (kind) {
    case "money":
      return money(value, opts);
    case "percent":
      return pct(value, opts);
    case "hours":
      return `${num(value, { sign: opts.sign, decimals: value % 1 === 0 ? 0 : value % 0.5 === 0 ? 1 : 2 })}h`;
    case "days":
      return num(value, { sign: opts.sign, decimals: 0 });
    case "count":
      return num(value, { sign: opts.sign });
  }
}
