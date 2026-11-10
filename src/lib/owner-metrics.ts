import { adSpendPlatform, isPaintAdExpense, jobPaidAdSource } from "@/lib/ad-source";
import { isPaintOnlyJob, isPaintOnlyLead } from "@/lib/paint-jobs";
import { EXPENSE_TYPES, type ExpenseType } from "@/lib/expenses";
import { getJobDateOnly } from "@/lib/dates";
import type { Customer, Expense, Job, Lead } from "@/types";

/** Days after this date are fully tracked. Earlier periods can be misleading. */
export const TRACKING_RELIABLE_AFTER = "2026-10-22";
export const TRACKING_RELIABLE_LABEL = "October 22, 2026";

export function leadHasAddress(lead: { address?: string }): boolean {
  return Boolean(lead.address?.trim());
}

export function periodIncludesEarlyTracking(from: string, to: string): boolean {
  const start = from <= to ? from : to;
  return start <= TRACKING_RELIABLE_AFTER;
}

export const SOURCE_BUCKETS = [
  "Facebook",
  "Instagram",
  "Google",
  "Friend or neighbor",
  "Previous customer",
  "Yard sign or truck",
  "Website",
  "Other",
] as const;

export type SourceBucket = (typeof SOURCE_BUCKETS)[number];

/** Website quotes from a Meta ad landing (`source: meta_ad`). Found-us Google/Facebook/Instagram is organic. */
export function isPaidAdLead(lead: { source?: string }): boolean {
  return lead.source === "meta_ad";
}

export const SOURCE_LABELS: Record<string, string> = {
  Facebook: "Facebook",
  Instagram: "Instagram",
  Google: "Google search",
  "Friend or neighbor": "Friend or neighbor referral",
  "Previous customer": "Previous customer",
  "Yard sign or truck": "Yard sign or saw our truck",
  Website: "Didn't say",
  Other: "Other",
  Untracked: "Untracked",
};

const STREET_SUFFIXES: Record<string, string> = {
  street: "st",
  st: "st",
  road: "rd",
  rd: "rd",
  avenue: "ave",
  ave: "ave",
  av: "ave",
  drive: "dr",
  dr: "dr",
  lane: "ln",
  ln: "ln",
  boulevard: "blvd",
  blvd: "blvd",
  court: "ct",
  ct: "ct",
  terrace: "ter",
  ter: "ter",
  place: "pl",
  pl: "pl",
  circle: "cir",
  cir: "cir",
  trail: "trl",
  trl: "trl",
  way: "way",
};

export interface SourceRow {
  source: string;
  inquiries: number;
  /** Inquiries that include a street, so a booking can be matched. */
  matchable: number;
  booked: number | null;
  jobTotal: number;
  collected: number;
}

export interface JobMoneyStats {
  jobs: number;
  jobTotal: number;
  collected: number;
  completed: number;
  scheduled: number;
  followUp: number;
  unpaid: number;
  firstTimeJobs: number;
  firstTimeRevenue: number;
  repeatJobs: number;
  repeatRevenue: number;
}

export interface CountRow {
  name: string;
  count: number;
}

export interface LeadFunnel {
  inquiries: number;
  matchable: number;
  matchableBooked: number;
  booked: number;
  withEmail: number;
  withPhotos: number;
  withMessage: number;
  statuses: { new: number; contacted: number; converted: number; lost: number };
  avgDaysToBook: number | null;
  services: CountRow[];
  jobs: JobMoneyStats;
}

export interface MetaMetrics {
  instantForm: LeadFunnel;
  marked: JobMoneyStats;
  inquiries: number;
  booked: number;
  jobs: number;
  jobTotal: number;
  collected: number;
  spend: number;
}

export interface GoogleAdsStats {
  jobs: JobMoneyStats;
  spend: number;
}

export interface ExpenseSlice {
  type: ExpenseType;
  amount: number;
}

export interface OwnerSnapshot {
  sources: SourceRow[];
  earlyTracking: boolean;
  inquiryTotal: number;
  matchableTotal: number;
  bookedTotal: number;
  jobTotal: number;
  collectedTotal: number;
  expensesByType: ExpenseSlice[];
  adSpend: number;
  adRevenue: number;
  googleAdSpend: number;
  googleAdRevenue: number;
  metaAdSpend: number;
  metaAdRevenue: number;
  meta: MetaMetrics;
  googleAds: GoogleAdsStats;
  foundUs: Record<SourceBucket, LeadFunnel>;
  untracked: JobMoneyStats;
  materials: number;
  completedJobs: number;
  materialsPerJob: number | null;
  firstTimeJobs: number;
  firstTimeRevenue: number;
  repeatJobs: number;
  repeatRevenue: number;
}

function clean(value?: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalStreet(value?: string): string {
  const cleaned = clean(value);
  if (!cleaned) return "";
  const parts = cleaned.split(" ");
  const last = parts[parts.length - 1];
  if (last && STREET_SUFFIXES[last]) parts[parts.length - 1] = STREET_SUFFIXES[last];
  return parts.join(" ");
}

export function bookingAddressKey(street?: string, city?: string): string | null {
  const streetPart = canonicalStreet(street);
  const cityPart = clean(city);
  if (!streetPart || !cityPart) return null;
  return `${streetPart}|${cityPart}`;
}

export function phoneKey(value?: string): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function leadSourceBucket(lead: { howYouFoundUs?: string; source?: string }): SourceBucket {
  const text = (lead.howYouFoundUs ?? "").toLowerCase();
  if (text.includes("instagram")) return "Instagram";
  if (text.includes("facebook") || text.includes("meta")) return "Facebook";
  if (text.includes("google")) return "Google";
  if (text.includes("yard") || text.includes("truck")) return "Yard sign or truck";
  if (text.includes("previous customer") || text.includes("repeat customer")) return "Previous customer";
  if (
    text.includes("referr") ||
    text.includes("friend") ||
    text.includes("neighbor") ||
    text.includes("know the owner") ||
    text.includes("i know")
  ) {
    return "Friend or neighbor";
  }
  if (text) return "Other";
  if (lead.source === "website") return "Website";
  return "Other";
}

function jobCustomer(job: Job): Customer | null {
  return typeof job.customer === "object" && job.customer !== null ? job.customer : null;
}

function isActive(job: Job): boolean {
  return job.status !== "Cancelled";
}

function emptyJobStats(): JobMoneyStats {
  return {
    jobs: 0,
    jobTotal: 0,
    collected: 0,
    completed: 0,
    scheduled: 0,
    followUp: 0,
    unpaid: 0,
    firstTimeJobs: 0,
    firstTimeRevenue: 0,
    repeatJobs: 0,
    repeatRevenue: 0,
  };
}

function emptyFunnel(): LeadFunnel {
  return {
    inquiries: 0,
    matchable: 0,
    matchableBooked: 0,
    booked: 0,
    withEmail: 0,
    withPhotos: 0,
    withMessage: 0,
    statuses: { new: 0, contacted: 0, converted: 0, lost: 0 },
    avgDaysToBook: null,
    services: [],
    jobs: emptyJobStats(),
  };
}

type WorkingFunnel = LeadFunnel & { days: number[]; serviceCounts: Map<string, number> };

function emptyWorkingFunnel(): WorkingFunnel {
  return { ...emptyFunnel(), days: [], serviceCounts: new Map() };
}

function countLead(funnel: WorkingFunnel, lead: Lead, booked: boolean, bookedJob?: Job) {
  funnel.inquiries += 1;
  const hasAddress = leadHasAddress(lead);
  if (hasAddress) funnel.matchable += 1;
  if (lead.email?.trim()) funnel.withEmail += 1;
  if ((lead.photoUrls ?? []).length > 0) funnel.withPhotos += 1;
  if (lead.message?.trim()) funnel.withMessage += 1;
  if (lead.status in funnel.statuses) funnel.statuses[lead.status] += 1;
  if (booked) {
    funnel.booked += 1;
    if (hasAddress) funnel.matchableBooked += 1;
    if (bookedJob) {
      const days = dayDiff(leadDay(lead), getJobDateOnly(bookedJob.jobDate));
      if (days >= 0) funnel.days.push(days);
    }
  }
  for (const service of lead.services ?? []) {
    const name = service.trim();
    if (!name) continue;
    funnel.serviceCounts.set(name, (funnel.serviceCounts.get(name) ?? 0) + 1);
  }
}

function freezeFunnel(funnel: WorkingFunnel): LeadFunnel {
  return {
    inquiries: funnel.inquiries,
    matchable: funnel.matchable,
    matchableBooked: funnel.matchableBooked,
    booked: funnel.booked,
    withEmail: funnel.withEmail,
    withPhotos: funnel.withPhotos,
    withMessage: funnel.withMessage,
    statuses: funnel.statuses,
    avgDaysToBook:
      funnel.days.length > 0
        ? Math.round(funnel.days.reduce((sum, days) => sum + days, 0) / funnel.days.length)
        : null,
    services: [...funnel.serviceCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    jobs: funnel.jobs,
  };
}

function addJobStats(stats: JobMoneyStats, job: Job, amount: number, repeat: boolean) {
  stats.jobs += 1;
  stats.jobTotal += amount;
  if (job.paid) stats.collected += amount;
  if (job.status === "Completed") {
    stats.completed += 1;
    if (!job.paid) stats.unpaid += 1;
  } else if (job.status === "Scheduled") {
    stats.scheduled += 1;
  } else if (job.status === "Needs Follow-Up") {
    stats.followUp += 1;
  }
  if (repeat) {
    stats.repeatJobs += 1;
    stats.repeatRevenue += amount;
  } else {
    stats.firstTimeJobs += 1;
    stats.firstTimeRevenue += amount;
  }
}

function dayDiff(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function leadDay(lead: Lead): string {
  return getJobDateOnly(lead.createdAt);
}

function pickLead(candidates: Lead[], jobDate: string): Lead | null {
  const before = candidates.filter((lead) => leadDay(lead) <= jobDate);
  if (before.length === 0) return null;
  return [...before].sort((a, b) => leadDay(b).localeCompare(leadDay(a)))[0] ?? null;
}

export interface JobAttribution {
  jobId: string;
  leadId: string | null;
  source: SourceBucket | null;
}

export function attributeJobs(jobs: Job[], leads: Lead[]): Map<string, JobAttribution> {
  const byAddress = new Map<string, Lead[]>();
  const byPhone = new Map<string, Lead[]>();

  for (const lead of leads) {
    if (lead.source === "phone") continue;
    if (isPaintOnlyLead(lead)) continue;
    const address = bookingAddressKey(lead.address, lead.town);
    const phone = phoneKey(lead.phone);
    if (!address && lead.source !== "meta_ad") continue;
    if (address) {
      const list = byAddress.get(address) ?? [];
      list.push(lead);
      byAddress.set(address, list);
    }
    if (phone) {
      const list = byPhone.get(phone) ?? [];
      list.push(lead);
      byPhone.set(phone, list);
    }
  }

  const attributed = new Map<string, JobAttribution>();

  for (const job of jobs) {
    if (!isActive(job)) continue;
    const customer = jobCustomer(job);
    const jobDate = getJobDateOnly(job.jobDate);
    const addressLeads = customer
      ? byAddress.get(bookingAddressKey(customer.streetAddress, customer.city) ?? "") ?? []
      : [];
    const phoneLeads = customer ? byPhone.get(phoneKey(customer.phone) ?? "") ?? [] : [];
    const pool = addressLeads.length > 0 ? addressLeads : phoneLeads;
    const lead = pickLead(pool, jobDate);
    attributed.set(job._id, {
      jobId: job._id,
      leadId: lead?._id ?? null,
      source: lead ? leadSourceBucket(lead) : null,
    });
  }

  return attributed;
}

function houseKey(job: Job): string | null {
  const customer = jobCustomer(job);
  if (!customer) return null;
  const address = bookingAddressKey(customer.streetAddress, customer.city);
  if (address) return `addr:${address}`;
  return `id:${customer._id}`;
}

export function computeOwnerSnapshot(
  jobs: Job[],
  leads: Lead[],
  expenses: Expense[],
  from: string,
  to: string
): OwnerSnapshot {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  jobs = jobs.filter((job) => (job.finalPrice ?? 0) > 0 && !isPaintOnlyJob(job));
  const jobsById = new Map(jobs.map((job) => [job._id, job]));
  const leadsById = new Map(leads.map((lead) => [lead._id, lead]));
  const attribution = attributeJobs(jobs, leads);
  const bookedLeadIds = new Set(
    [...attribution.values()].map((item) => item.leadId).filter((id): id is string => Boolean(id))
  );
  const jobIdByLeadId = new Map<string, string>();
  for (const item of attribution.values()) {
    if (item.leadId) jobIdByLeadId.set(item.leadId, item.jobId);
  }

  const seenHouses = new Set<string>();
  const repeatByJobId = new Map<string, boolean>();
  const ordered = jobs
    .filter(isActive)
    .slice()
    .sort((a, b) => getJobDateOnly(a.jobDate).localeCompare(getJobDateOnly(b.jobDate)));

  let firstTimeJobs = 0;
  let firstTimeRevenue = 0;
  let repeatJobs = 0;
  let repeatRevenue = 0;

  for (const job of ordered) {
    const key = houseKey(job);
    const repeat = key ? seenHouses.has(key) : false;
    if (key) seenHouses.add(key);
    repeatByJobId.set(job._id, repeat);
    if (!inRange(getJobDateOnly(job.jobDate), start, end)) continue;
    const amount = job.finalPrice ?? 0;
    if (repeat) {
      repeatJobs += 1;
      repeatRevenue += amount;
    } else {
      firstTimeJobs += 1;
      firstTimeRevenue += amount;
    }
  }

  const working = new Map<SourceBucket, WorkingFunnel>();
  for (const source of SOURCE_BUCKETS) working.set(source, emptyWorkingFunnel());
  const metaFunnel = emptyWorkingFunnel();
  const markedMeta = emptyJobStats();
  const googleAdJobs = emptyJobStats();
  const untracked = emptyJobStats();

  for (const lead of leads) {
    if (lead.source === "phone") continue;
    if (isPaintOnlyLead(lead)) continue;
    if (!inRange(leadDay(lead), start, end)) continue;

    const bookedJob = jobsById.get(jobIdByLeadId.get(lead._id) ?? "");
    const booked = bookedLeadIds.has(lead._id);
    if (lead.source === "meta_ad") {
      countLead(metaFunnel, lead, booked, bookedJob);
      continue;
    }
    if (bookedJob?.adSource === "google" || bookedJob?.adSource === "meta") continue;
    countLead(working.get(leadSourceBucket(lead))!, lead, booked, bookedJob);
  }

  let googleAdRevenue = 0;
  let metaAdRevenue = 0;

  for (const job of jobs) {
    if (!isActive(job) || !inRange(getJobDateOnly(job.jobDate), start, end)) continue;
    const amount = job.finalPrice ?? 0;
    const repeat = repeatByJobId.get(job._id) ?? false;
    const leadId = attribution.get(job._id)?.leadId;
    const lead = leadId ? leadsById.get(leadId) : null;
    const platform = jobPaidAdSource(job, lead);
    if (platform === "google") googleAdRevenue += amount;
    if (platform === "meta") metaAdRevenue += amount;

    if (job.adSource === "google") {
      addJobStats(googleAdJobs, job, amount, repeat);
      continue;
    }
    if (lead?.source === "meta_ad") {
      addJobStats(metaFunnel.jobs, job, amount, repeat);
      continue;
    }
    if (job.adSource === "meta") {
      addJobStats(markedMeta, job, amount, repeat);
      continue;
    }

    const source = attribution.get(job._id)?.source;
    if (source) addJobStats(working.get(source)!.jobs, job, amount, repeat);
    else addJobStats(untracked, job, amount, repeat);
  }

  const foundUs = Object.fromEntries(
    SOURCE_BUCKETS.map((source) => [source, freezeFunnel(working.get(source)!)])
  ) as Record<SourceBucket, LeadFunnel>;
  const instantForm = freezeFunnel(metaFunnel);

  const sources: SourceRow[] = SOURCE_BUCKETS.map((source) => {
    const funnel = foundUs[source];
    return {
      source,
      inquiries: funnel.inquiries,
      matchable: funnel.matchable,
      booked: funnel.inquiries > 0 ? funnel.booked : null,
      jobTotal: funnel.jobs.jobTotal,
      collected: funnel.jobs.collected,
    };
  }).filter((row) => row.inquiries > 0 || row.jobTotal > 0);
  if (untracked.jobs > 0) {
    sources.push({
      source: "Untracked",
      inquiries: 0,
      matchable: 0,
      booked: null,
      jobTotal: untracked.jobTotal,
      collected: untracked.collected,
    });
  }

  const periodExpenses = expenses.filter(
    (expense) => inRange(getJobDateOnly(expense.date), start, end) && !isPaintAdExpense(expense)
  );
  const expensesByType = EXPENSE_TYPES.map((type) => ({
    type,
    amount: periodExpenses
      .filter((expense) => expense.type === type)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));

  const adSpend = expensesByType.find((slice) => slice.type === "Ads")?.amount ?? 0;
  let googleAdSpend = 0;
  let metaAdSpend = 0;
  for (const expense of periodExpenses) {
    if (expense.type !== "Ads") continue;
    const platform = adSpendPlatform(expense.note);
    if (platform === "google") googleAdSpend += expense.amount;
    if (platform === "meta") metaAdSpend += expense.amount;
  }

  const meta: MetaMetrics = {
    instantForm,
    marked: markedMeta,
    inquiries: instantForm.inquiries + markedMeta.jobs,
    booked: instantForm.booked + markedMeta.jobs,
    jobs: instantForm.jobs.jobs + markedMeta.jobs,
    jobTotal: instantForm.jobs.jobTotal + markedMeta.jobTotal,
    collected: instantForm.jobs.collected + markedMeta.collected,
    spend: metaAdSpend,
  };
  const adRevenue = googleAdRevenue + metaAdRevenue;
  const materials =
    (expensesByType.find((slice) => slice.type === "Gas")?.amount ?? 0) +
    (expensesByType.find((slice) => slice.type === "Bleach")?.amount ?? 0);

  const completedJobs = jobs.filter(
    (job) => job.status === "Completed" && inRange(getJobDateOnly(job.jobDate), start, end)
  ).length;

  const counted = sources.filter((row) => row.source !== "Untracked");
  return {
    sources,
    earlyTracking: periodIncludesEarlyTracking(start, end),
    inquiryTotal:
      counted.reduce((sum, row) => sum + row.inquiries, 0) + instantForm.inquiries + markedMeta.jobs,
    matchableTotal: counted.reduce((sum, row) => sum + row.matchable, 0) + instantForm.matchable,
    bookedTotal:
      counted.reduce((sum, row) => sum + (row.booked ?? 0), 0) + instantForm.booked + markedMeta.jobs,
    jobTotal:
      sources.reduce((sum, row) => sum + row.jobTotal, 0) + meta.jobTotal + googleAdJobs.jobTotal,
    collectedTotal:
      sources.reduce((sum, row) => sum + row.collected, 0) +
      meta.collected +
      googleAdJobs.collected,
    expensesByType,
    adSpend,
    adRevenue,
    googleAdSpend,
    googleAdRevenue,
    metaAdSpend,
    metaAdRevenue,
    meta,
    googleAds: { jobs: googleAdJobs, spend: googleAdSpend },
    foundUs,
    untracked,
    materials,
    completedJobs,
    materialsPerJob: completedJobs > 0 ? materials / completedJobs : null,
    firstTimeJobs,
    firstTimeRevenue,
    repeatJobs,
    repeatRevenue,
  };
}
