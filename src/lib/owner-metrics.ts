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
  "Referral",
  "Yard sign or truck",
  "Website",
  "Other",
] as const;

export type SourceBucket = (typeof SOURCE_BUCKETS)[number];

const AD_SOURCES = new Set<SourceBucket>(["Facebook", "Instagram", "Google"]);

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
  if (
    text.includes("referr") ||
    text.includes("friend") ||
    text.includes("neighbor") ||
    text.includes("previous customer") ||
    text.includes("know the owner") ||
    text.includes("i know")
  ) {
    return "Referral";
  }
  if (text) return "Other";
  if (lead.source === "meta_ad") return "Facebook";
  if (lead.source === "website") return "Website";
  return "Other";
}

function jobCustomer(job: Job): Customer | null {
  return typeof job.customer === "object" && job.customer !== null ? job.customer : null;
}

function isActive(job: Job): boolean {
  return job.status !== "Cancelled";
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
    if (lead.source === "phone" || !leadHasAddress(lead)) continue;
    const address = bookingAddressKey(lead.address, lead.town);
    if (address) {
      const list = byAddress.get(address) ?? [];
      list.push(lead);
      byAddress.set(address, list);
    }
    const phone = phoneKey(lead.phone);
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
  const attribution = attributeJobs(jobs, leads);
  const bookedLeadIds = new Set(
    [...attribution.values()].map((item) => item.leadId).filter((id): id is string => Boolean(id))
  );

  const rows = new Map<string, SourceRow>();
  for (const source of SOURCE_BUCKETS) {
    rows.set(source, { source, inquiries: 0, matchable: 0, booked: 0, jobTotal: 0, collected: 0 });
  }
  const noLead: SourceRow = {
    source: "Untracked",
    inquiries: 0,
    matchable: 0,
    booked: null,
    jobTotal: 0,
    collected: 0,
  };

  for (const lead of leads) {
    if (lead.source === "phone") continue;
    const day = leadDay(lead);
    if (!inRange(day, start, end)) continue;
    const row = rows.get(leadSourceBucket(lead));
    if (!row) continue;
    row.inquiries += 1;
    if (!leadHasAddress(lead)) continue;
    row.matchable += 1;
    if (bookedLeadIds.has(lead._id)) row.booked = (row.booked ?? 0) + 1;
  }

  for (const row of rows.values()) {
    if (row.matchable === 0) row.booked = null;
  }

  for (const job of jobs) {
    if (!isActive(job) || !inRange(getJobDateOnly(job.jobDate), start, end)) continue;
    const amount = job.finalPrice ?? 0;
    const source = attribution.get(job._id)?.source;
    const row = source ? rows.get(source) : noLead;
    if (!row) continue;
    row.jobTotal += amount;
    if (job.paid) row.collected += amount;
  }

  const sources = [...SOURCE_BUCKETS.map((source) => rows.get(source)!).filter(
    (row) => row.inquiries > 0 || row.jobTotal > 0
  )];
  if (noLead.jobTotal > 0) sources.push(noLead);

  const periodExpenses = expenses.filter((expense) => inRange(getJobDateOnly(expense.date), start, end));
  const expensesByType = EXPENSE_TYPES.map((type) => ({
    type,
    amount: periodExpenses
      .filter((expense) => expense.type === type)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));

  const adSpend = expensesByType.find((slice) => slice.type === "Ads")?.amount ?? 0;
  const adRevenue = sources
    .filter((row) => AD_SOURCES.has(row.source as SourceBucket))
    .reduce((sum, row) => sum + row.jobTotal, 0);
  const materials =
    (expensesByType.find((slice) => slice.type === "Gas")?.amount ?? 0) +
    (expensesByType.find((slice) => slice.type === "Bleach")?.amount ?? 0);

  const completedJobs = jobs.filter(
    (job) => job.status === "Completed" && inRange(getJobDateOnly(job.jobDate), start, end)
  ).length;

  const seenHouses = new Set<string>();
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

  const counted = sources.filter((row) => row.source !== "Untracked");
  return {
    sources,
    earlyTracking: periodIncludesEarlyTracking(start, end),
    inquiryTotal: counted.reduce((sum, row) => sum + row.inquiries, 0),
    matchableTotal: counted.reduce((sum, row) => sum + row.matchable, 0),
    bookedTotal: counted.reduce((sum, row) => sum + (row.booked ?? 0), 0),
    jobTotal: sources.reduce((sum, row) => sum + row.jobTotal, 0),
    collectedTotal: sources.reduce((sum, row) => sum + row.collected, 0),
    expensesByType,
    adSpend,
    adRevenue,
    materials,
    completedJobs,
    materialsPerJob: completedJobs > 0 ? materials / completedJobs : null,
    firstTimeJobs,
    firstTimeRevenue,
    repeatJobs,
    repeatRevenue,
  };
}
