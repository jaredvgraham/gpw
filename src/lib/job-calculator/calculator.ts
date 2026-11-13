import { contiguousSeason, firstActiveMonth, inferContiguous, operatingMonthCount } from "./calendar";
import type { Cents } from "./money";
import { withOwnerCount, withTruckCount } from "./mutations";
import type { Expense, Frequency, Scenario } from "./types";

/**
 * The job calculator speaks in the units an operator actually knows:
 * a price per job, a payroll per day, ad spend per week, a bill per month.
 * `applyCalculator` writes those into the scenario the engine already
 * understands (production revenue, per-job and weekly expenses).
 */
export interface CalculatorInput {
  /** What you charge for one job. Null until the user types it. */
  ticket: Cents | null;
  jobsPerDay: number;
  daysPerWeek: number;
  /** Operating months, kept as one contiguous block. */
  months: number;
  trucks: number;
  /** Trucks that pay a crew. The rest are owner-operated. */
  hiredTrucks: number;
  /** Chemicals and supplies, per job. Null means "not in the total". */
  suppliesPerJob: Cents | null;
  fuelPerDay: Cents | null;
  /** Crew wages per working day, hired trucks only. */
  payrollPerDay: Cents | null;
  /** Advertising per truck, per week. */
  adsPerWeek: Cents | null;
  /** Optional pay for trucks the owner drives, per working day. */
  ownerPayPerDay: Cents | null;
  /** Per month, all year. */
  insurancePerMonth: Cents | null;
  /** Shop or storage, per month, all year. */
  rentPerMonth: Cents | null;
  /**
   * Jobs per day for each owner-operated truck, in fleet order.
   * With two or more owners these replace the shared jobs-per-day.
   * A single owner follows `jobsPerDay`.
   */
  ownerJobsPerDay: number[];
}

function expense(s: Scenario, key: string): Expense | undefined {
  return s.expenses.find((e) => e.catalogKey === key);
}

function configuredAmount(e: Expense | undefined): Cents | null {
  if (!e || e.status !== "configured" || e.amount == null) return null;
  return e.amount;
}

/** Weekly (or per-job) amount expressed per day or per job. Other frequencies are left alone. */
function perDay(e: Expense | undefined, days: number): Cents | null {
  const amount = configuredAmount(e);
  if (amount == null || e?.frequency !== "weekly" || days <= 0) return null;
  return Math.round(amount / days);
}

function perJob(e: Expense | undefined, jobsPerDay: number, days: number): Cents | null {
  const amount = configuredAmount(e);
  if (amount == null || !e) return null;
  if (e.frequency === "per_job") return amount;
  if (e.frequency === "weekly" && jobsPerDay > 0 && days > 0) return Math.round(amount / (jobsPerDay * days));
  return null;
}

export function readCalculator(s: Scenario): CalculatorInput {
  const days = s.revenue.workingDaysPerWeek || 5;
  const jobs = s.revenue.jobsPerDay || 3;
  const insurance = expense(s, "truck_insurance");
  const rent = expense(s, "rent");
  const advertising = expense(s, "advertising");
  return {
    ticket: s.revenue.avgTicket,
    jobsPerDay: jobs,
    daysPerWeek: days,
    months: Math.max(1, operatingMonthCount(s.season)),
    trucks: Math.max(1, s.trucks.length),
    hiredTrucks: s.trucks.filter((t) => t.operator === "hired").length,
    suppliesPerJob: perJob(expense(s, "bleach"), jobs, days),
    fuelPerDay: perDay(expense(s, "truck_fuel"), days),
    payrollPerDay: perDay(expense(s, "crew_payroll"), days),
    adsPerWeek: advertising?.frequency === "weekly" ? configuredAmount(advertising) : null,
    ownerPayPerDay: perDay(expense(s, "owner_compensation"), days),
    insurancePerMonth: insurance?.frequency === "monthly" ? configuredAmount(insurance) : null,
    rentPerMonth: rent?.frequency === "monthly" ? configuredAmount(rent) : null,
    ownerJobsPerDay: s.trucks
      .filter((t) => t.operator === "owner")
      .map((t) => (t.overrides.jobsPerDay != null ? t.overrides.jobsPerDay : jobs)),
  };
}

function writeCost(
  s: Scenario,
  key: string,
  amount: Cents | null,
  frequency: Frequency,
  owned: Frequency[],
): void {
  const e = expense(s, key);
  if (!e) return;
  if (amount == null) {
    // Only clear costs the calculator itself is showing. A yearly insurance
    // policy entered on the expenses page stays put and shows up as "other".
    if (owned.includes(e.frequency) || e.status !== "configured") {
      e.status = "not_configured";
      e.amount = null;
    }
    return;
  }
  e.status = "configured";
  e.amount = Math.max(0, Math.round(amount));
  e.frequency = frequency;
}

export function applyCalculator(s: Scenario, input: CalculatorInput): Scenario {
  const trucks = Math.max(1, Math.round(input.trucks));
  const hired = Math.max(0, Math.min(trucks, Math.round(input.hiredTrucks)));
  const days = Math.max(1, Math.min(7, input.daysPerWeek));
  const jobs = Math.max(0, input.jobsPerDay);
  const months = Math.max(1, Math.min(12, Math.round(input.months)));

  let next = withTruckCount(s, trucks);
  next = withOwnerCount(next, trucks - hired);

  const info = inferContiguous(next.season.activeMonths);
  const start = info ? info.start : firstActiveMonth(next.season);
  next.season.activeMonths = contiguousSeason(Math.max(0, start), months);

  next.revenue.mode = "production";
  next.revenue.avgTicket = input.ticket;
  next.revenue.jobsPerDay = jobs;
  next.revenue.workingDaysPerWeek = days;
  next.revenue.utilizationPct = 100;
  next.revenue.cancellationPct = 0;
  next.revenue.weatherDowntimePct = 0;
  if (input.ticket != null && jobs > 0) {
    next.revenue.monthlyGrossPerTruck = Math.round(input.ticket * jobs * days * (52 / 12));
  }
  next.labor.payrollModel = "fixed_weekly";

  // Per-truck weekly overrides would silently replace the numbers in these boxes.
  // Two or more owner trucks can each keep their own jobs per day.
  const ownerCount = trucks - hired;
  const splitOwners = ownerCount >= 2;
  const ownerJobs = input.ownerJobsPerDay ?? [];
  let ownerIndex = 0;
  next.trucks = next.trucks.map((t) => {
    let jobsPerDay: number | null = null;
    if (t.operator === "owner" && splitOwners) {
      const typed = ownerJobs[ownerIndex++];
      jobsPerDay = Math.max(0, Math.min(20, typed != null ? typed : jobs));
    }
    return {
      ...t,
      overrides: {
        ...t.overrides,
        weeklyChemicals: null,
        weeklyAdvertising: null,
        weeklyPayroll: null,
        jobsPerDay,
      },
    };
  });

  writeCost(next, "bleach", input.suppliesPerJob, "per_job", ["per_job", "weekly"]);
  writeCost(next, "truck_fuel", input.fuelPerDay == null ? null : input.fuelPerDay * days, "weekly", ["weekly"]);
  writeCost(next, "crew_payroll", input.payrollPerDay == null ? null : input.payrollPerDay * days, "weekly", ["weekly"]);
  writeCost(next, "advertising", input.adsPerWeek, "weekly", ["weekly"]);
  writeCost(next, "owner_compensation", input.ownerPayPerDay == null ? null : input.ownerPayPerDay * days, "weekly", ["weekly"]);
  writeCost(next, "truck_insurance", input.insurancePerMonth, "monthly", ["monthly"]);
  writeCost(next, "rent", input.rentPerMonth, "monthly", ["monthly"]);

  const insurance = expense(next, "truck_insurance");
  if (insurance && input.insurancePerMonth != null) insurance.timing = "year_round";
  const rent = expense(next, "rent");
  if (rent && input.rentPerMonth != null) rent.timing = "year_round";

  return next;
}
