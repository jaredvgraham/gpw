import { MONTH_LABELS, weeksInMonth } from "./calendar";
import { CATEGORY_META } from "./catalog";
import { type Cents, div, marginPct, mul, pctOf, sum } from "./money";
import {
  ALL_CATEGORIES,
  type CategoryTotals,
  type Completeness,
  type EngineMeta,
  type Expense,
  type ExpenseCategory,
  type ExpenseLineResult,
  type Kpis,
  type MonthResult,
  OPERATING_CATEGORIES,
  type Results,
  type Scenario,
  type Totals,
  type Truck,
  type TruckLine,
  type TruckMonth,
  type TruckResult,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function zeroCategories(): CategoryTotals {
  const out = {} as CategoryTotals;
  for (const c of ALL_CATEGORIES) out[c] = 0;
  return out;
}

function addCategories(target: CategoryTotals, source: CategoryTotals) {
  for (const c of ALL_CATEGORIES) target[c] += source[c];
}

export function operatingSum(cat: CategoryTotals): Cents {
  let t = 0;
  for (const c of OPERATING_CATEGORIES) t += cat[c];
  return t;
}

export function isOperatingCategory(c: ExpenseCategory): boolean {
  return CATEGORY_META[c].group === "operating";
}

/** Weekly crew payroll per hired truck, honoring the selected payroll model. */
export function effectiveWeeklyPayroll(scenario: Scenario, truck?: Truck): Cents | null {
  const exp = scenario.expenses.find((e) => e.catalogKey === "crew_payroll");
  if (truck?.overrides.weeklyPayroll != null) return truck.overrides.weeklyPayroll;
  if (scenario.labor.payrollModel === "hourly") {
    const { employeesPerCrew, crewsPerTruck, hoursPerWeekPerEmployee, hourlyWage } = scenario.labor;
    return mul(hourlyWage, employeesPerCrew * crewsPerTruck * hoursPerWeekPerEmployee);
  }
  if (!exp || exp.status !== "configured" || exp.amount == null) return null;
  return exp.amount;
}

/** Resolves the effective amount for an expense applied to a given truck. */
function effectiveAmount(scenario: Scenario, expense: Expense, truck: Truck | null): number | null {
  if (expense.status !== "configured") return null;
  if (truck) {
    switch (expense.catalogKey) {
      case "crew_payroll":
        return effectiveWeeklyPayroll(scenario, truck);
      case "bleach":
        if (truck.overrides.weeklyChemicals != null) return truck.overrides.weeklyChemicals;
        break;
      case "advertising":
        if (truck.overrides.weeklyAdvertising != null) return truck.overrides.weeklyAdvertising;
        break;
    }
  } else if (expense.catalogKey === "crew_payroll") {
    return effectiveWeeklyPayroll(scenario);
  }
  return expense.amount;
}

function trucksForScope(scenario: Scenario, expense: Expense): Truck[] {
  switch (expense.scope) {
    case "all_trucks":
      return scenario.trucks;
    case "hired_trucks":
      return scenario.trucks.filter((t) => t.operator === "hired");
    case "owner_trucks":
      return scenario.trucks.filter((t) => t.operator === "owner");
    case "specific_truck":
      return scenario.trucks.filter((t) => t.id === expense.truckId);
    case "company":
      return [];
  }
}

/** Monthly loan payment for a fully amortizing loan. */
export function amortizedPayment(principal: Cents, annualRatePct: number, termMonths: number): Cents {
  if (principal <= 0 || termMonths <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return div(principal, termMonths);
  const factor = r / (1 - Math.pow(1 + r, -termMonths));
  return mul(principal, factor);
}

export interface NewTruckCapital {
  capexTotal: Cents;
  financedBase: Cents;
  loanAmount: Cents;
  cashOutlay: Cents;
  startupCosts: Cents;
  monthlyPayment: Cents;
  monthlyDepreciation: Cents;
  workingCapital: Cents;
  initialCashRequired: Cents;
}

export function newTruckCapital(scenario: Scenario, weeklyOperatingPerTruck: Cents = 0): NewTruckCapital {
  const x = scenario.expansion;
  const capexTotal = x.truckPrice + x.equipmentCost + x.trailerCost + x.wrapCost;
  const financedBase = x.truckPrice + (x.financeEquipment ? x.equipmentCost + x.trailerCost + x.wrapCost : 0);
  const loanAmount = pctOf(financedBase, 100 - x.downPaymentPct);
  const cashOutlay = capexTotal - loanAmount;
  const startupCosts = x.initialChemicals + x.hiringTraining + x.startupAdvertising + x.otherSetup;
  const monthlyPayment = amortizedPayment(loanAmount, x.interestRatePct, x.loanTermMonths);
  const monthlyDepreciation = x.depreciationYears > 0 ? div(capexTotal, x.depreciationYears * 12) : 0;
  const workingCapital = mul(weeklyOperatingPerTruck, x.workingCapitalWeeks);
  return {
    capexTotal,
    financedBase,
    loanAmount,
    cashOutlay,
    startupCosts,
    monthlyPayment,
    monthlyDepreciation,
    workingCapital,
    initialCashRequired: cashOutlay + startupCosts + workingCapital,
  };
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

interface LineAccumulator {
  expenseId: string;
  catalogKey?: string;
  name: string;
  category: ExpenseCategory;
  status: Expense["status"];
  scope: Expense["scope"];
  frequency: Expense["frequency"];
  timing: Expense["timing"];
  amount: number | null;
  monthly: Cents[];
  derived: boolean;
  warnings: Set<string>;
}

export function computeResults(scenario: Scenario): Results {
  const warnings: string[] = [];
  const warn = (msg: string) => {
    if (!warnings.includes(msg)) warnings.push(msg);
  };

  const { season, revenue: rev, trucks } = scenario;
  const months = Array.from({ length: 12 }, (_, i) => i);
  const weeks = months.map((m) => weeksInMonth(m, season.weeksMethod));
  const seasonActive = months.map((m) => Boolean(season.activeMonths[m]));
  const operatingMonths = seasonActive.filter(Boolean).length;
  if (operatingMonths === 0) warn("No operating months are selected — revenue is $0 all year.");

  // Truck-level availability
  const truckExists = trucks.map((t) =>
    months.map((m) => (t.acquisition === "new" ? m >= t.startMonth : true)),
  );
  const truckActive = trucks.map((t) =>
    months.map((m) => seasonActive[m] && m >= t.startMonth),
  );
  trucks.forEach((t, i) => {
    if (operatingMonths > 0 && !truckActive[i].some(Boolean)) {
      warn(`${t.name} enters service in ${MONTH_LABELS[t.startMonth]}, after the season ends — it earns no revenue.`);
    }
  });

  // Per truck-month accumulators
  const tm: TruckMonth[][] = trucks.map((_, ti) =>
    months.map((m) => ({
      monthIndex: m,
      active: truckActive[ti][m],
      weeks: weeks[m],
      revenue: 0,
      jobs: null,
      leads: null,
      bookings: null,
      capacityJobs: null,
      byCategory: zeroCategories(),
      directOperating: 0,
      contribution: 0,
    })),
  );
  const companyByCategory: CategoryTotals[] = months.map(() => zeroCategories());
  const capexByMonth = months.map(() => 0);
  const financingProceedsByMonth = months.map(() => 0);

  const lines = new Map<string, LineAccumulator>();
  const lineFor = (expense: Expense): LineAccumulator => {
    let l = lines.get(expense.id);
    if (!l) {
      l = {
        expenseId: expense.id,
        catalogKey: expense.catalogKey,
        name: expense.name,
        category: expense.category,
        status: expense.status,
        scope: expense.scope,
        frequency: expense.frequency,
        timing: expense.timing,
        amount: expense.amount,
        monthly: months.map(() => 0),
        derived: false,
        warnings: new Set(),
      };
      lines.set(expense.id, l);
    }
    return l;
  };
  const derivedLine = (id: string, name: string, category: ExpenseCategory): LineAccumulator => {
    let l = lines.get(id);
    if (!l) {
      l = {
        expenseId: id,
        name,
        category,
        status: "configured",
        scope: "specific_truck",
        frequency: "monthly",
        timing: "year_round",
        amount: null,
        monthly: months.map(() => 0),
        derived: true,
        warnings: new Set(),
      };
      lines.set(id, l);
    }
    return l;
  };

  // Register every expense so unconfigured ones still appear in the breakdown.
  for (const e of scenario.expenses) lineFor(e);

  /** Whether an expense applies to (truck, month) or (company, month). */
  const applies = (expense: Expense, ti: number | null, m: number): boolean => {
    if (ti === null) {
      if (expense.timing === "season") return seasonActive[m];
      if (expense.timing === "off_season") return !seasonActive[m];
      return true;
    }
    if (expense.timing === "season") return truckActive[ti][m];
    if (expense.timing === "off_season") return truckExists[ti][m] && !seasonActive[m];
    return truckExists[ti][m];
  };

  const applicableMonthCount = (expense: Expense, ti: number | null) =>
    months.filter((m) => applies(expense, ti, m)).length;

  // Per-truck, per-line seasonal totals (for truck-level detail views).
  const truckLines: Map<string, TruckLine>[] = trucks.map(() => new Map());
  const addTruckLine = (ti: number, id: string, name: string, category: ExpenseCategory, cents: Cents, catalogKey?: string) => {
    const map = truckLines[ti];
    const existing = map.get(id);
    if (existing) existing.total += cents;
    else map.set(id, { expenseId: id, catalogKey, name, category, total: cents });
  };

  const record = (expense: Expense, ti: number | null, m: number, cents: Cents) => {
    if (cents === 0) return;
    const line = lineFor(expense);
    line.monthly[m] += cents;
    if (ti === null) companyByCategory[m][expense.category] += cents;
    else {
      tm[ti][m].byCategory[expense.category] += cents;
      addTruckLine(ti, expense.id, expense.name, expense.category, cents, expense.catalogKey);
    }
  };

  const configuredExpenses = scenario.expenses.filter((e) => e.status === "configured");

  // Pass 1 — fixed-frequency expenses (weekly / monthly / yearly). These never
  // depend on revenue, so they can also drive lead-based revenue.
  const fixedFreq = configuredExpenses.filter((e) =>
    e.frequency === "weekly" || e.frequency === "monthly" || e.frequency === "yearly",
  );
  for (const e of fixedFreq) {
    if (e.scope === "company") {
      const amount = effectiveAmount(scenario, e, null);
      if (amount == null) continue;
      const count = applicableMonthCount(e, null);
      for (const m of months) {
        if (!applies(e, null, m)) continue;
        const cents =
          e.frequency === "weekly" ? mul(amount, weeks[m])
          : e.frequency === "monthly" ? amount
          : div(amount, count);
        record(e, null, m, cents);
      }
    } else {
      for (const t of trucksForScope(scenario, e)) {
        const ti = trucks.indexOf(t);
        const amount = effectiveAmount(scenario, e, t);
        if (amount == null) continue;
        const count = applicableMonthCount(e, ti);
        for (const m of months) {
          if (!applies(e, ti, m)) continue;
          const cents =
            e.frequency === "weekly" ? mul(amount, weeks[m])
            : e.frequency === "monthly" ? amount
            : div(amount, count);
          record(e, ti, m, cents);
        }
      }
    }
  }

  // New-truck startup costs, capex, financing, depreciation.
  const capital = newTruckCapital(scenario);
  trucks.forEach((t, ti) => {
    if (t.acquisition !== "new") return;
    const sm = t.startMonth;
    const x = scenario.expansion;
    const startup: [Cents, ExpenseCategory, string][] = [
      [x.initialChemicals, "chemicals", "Initial chemical inventory"],
      [x.hiringTraining, "payroll", "Hiring & training"],
      [x.startupAdvertising, "marketing", "Startup advertising"],
      [x.otherSetup, "overhead", "Other setup expenses"],
    ];
    for (const [cents, cat, label] of startup) {
      if (cents <= 0) continue;
      const l = derivedLine(`startup:${cat}`, `${label} (new trucks)`, cat);
      l.scope = "specific_truck";
      l.monthly[sm] += cents;
      tm[ti][sm].byCategory[cat] += cents;
      addTruckLine(ti, `startup:${cat}`, label, cat, cents);
    }
    capexByMonth[sm] += capital.capexTotal;
    financingProceedsByMonth[sm] += capital.loanAmount;

    // Depreciation from the purchase month onward.
    if (capital.monthlyDepreciation > 0) {
      const l = derivedLine("derived:depreciation", "Depreciation (new trucks)", "depreciation");
      for (let m = sm; m < 12; m++) {
        l.monthly[m] += capital.monthlyDepreciation;
        tm[ti][m].byCategory.depreciation += capital.monthlyDepreciation;
        addTruckLine(ti, "derived:depreciation", "Depreciation", "depreciation", capital.monthlyDepreciation);
      }
    }

    // Amortization — first payment the month after purchase.
    if (capital.loanAmount > 0 && capital.monthlyPayment > 0) {
      const li = derivedLine("derived:interest", "Loan interest (new trucks)", "interest");
      const lp = derivedLine("derived:principal", "Loan principal (new trucks)", "principal");
      const r = x.interestRatePct / 100 / 12;
      let balance = capital.loanAmount;
      for (let m = sm + 1; m < 12 && balance > 0; m++) {
        const interest = mul(balance, r);
        const principal = Math.min(balance, capital.monthlyPayment - interest);
        balance -= principal;
        li.monthly[m] += interest;
        lp.monthly[m] += principal;
        tm[ti][m].byCategory.interest += interest;
        tm[ti][m].byCategory.principal += principal;
        addTruckLine(ti, "derived:interest", "Loan interest", "interest", interest);
        addTruckLine(ti, "derived:principal", "Loan principal", "principal", principal);
      }
    }
  });

  // Pass 2 — revenue per truck-month.
  const perfOf = (t: Truck) => t.overrides.performanceMultiplier ?? 1;
  const baseMonthly = (t: Truck) => t.overrides.monthlyRevenue ?? rev.monthlyGrossPerTruck;

  if (rev.mode === "production" && rev.avgTicket == null) {
    warn("Production-based revenue requires an average job ticket — revenue is $0 until it is configured.");
  }
  if (rev.mode === "lead") {
    if (rev.avgTicket == null) warn("Lead-based revenue requires an average job ticket.");
    if (rev.costPerLead == null) warn("Lead-based revenue requires a cost per lead.");
    if (rev.leadToBookingPct == null) warn("Lead-based revenue requires a lead-to-booking conversion rate.");
  }

  trucks.forEach((t, ti) => {
    for (const m of months) {
      const cell = tm[ti][m];
      if (!truckActive[ti][m]) continue;
      const mult = season.monthMultipliers[m] ?? 1;
      const perf = perfOf(t);
      const jobsPerDay = t.overrides.jobsPerDay != null ? t.overrides.jobsPerDay : rev.jobsPerDay;
      const capacityJobs =
        jobsPerDay * rev.workingDaysPerWeek * weeks[m] * (1 - rev.weatherDowntimePct / 100);
      cell.capacityJobs = capacityJobs;

      if (rev.mode === "manual") {
        cell.revenue = mul(baseMonthly(t), mult * perf);
        cell.jobs = rev.avgTicket ? cell.revenue / rev.avgTicket : null;
      } else if (rev.mode === "production") {
        if (rev.avgTicket == null) {
          cell.revenue = 0;
          cell.jobs = 0;
        } else {
          const completed =
            capacityJobs * (rev.utilizationPct / 100) * (1 - rev.cancellationPct / 100) * mult * perf;
          cell.jobs = completed;
          cell.revenue = mul(rev.avgTicket, completed);
        }
      } else {
        // Lead-based: marketing spend → leads → bookings → completed (capped by capacity).
        const adSpend = cell.byCategory.marketing;
        if (rev.avgTicket == null || rev.costPerLead == null || rev.leadToBookingPct == null || rev.costPerLead <= 0) {
          cell.revenue = 0;
          cell.jobs = 0;
        } else {
          const leads = (adSpend / rev.costPerLead) * mult;
          const bookings = leads * (rev.leadToBookingPct / 100) * perf;
          const afterCancel = bookings * (1 - rev.cancellationPct / 100);
          const completed = Math.min(afterCancel, capacityJobs);
          cell.leads = leads;
          cell.bookings = bookings;
          cell.jobs = completed;
          cell.revenue = mul(rev.avgTicket, completed);
          if (afterCancel > capacityJobs + 1e-9) {
            warn(`${t.name} in ${MONTH_LABELS[m]}: lead volume exceeds crew capacity — jobs capped at ${Math.floor(capacityJobs)}.`);
          }
        }
      }
    }
  });

  const monthRevenue = months.map((m) => sum(trucks.map((_, ti) => tm[ti][m].revenue)));
  const monthJobs = months.map((m) => {
    let total = 0;
    let known = false;
    trucks.forEach((_, ti) => {
      const j = tm[ti][m].jobs;
      if (j != null) {
        total += j;
        known = true;
      }
    });
    return known ? total : null;
  });

  // Pass 3 — revenue-dependent expenses (per job, % of revenue).
  const revDependent = configuredExpenses.filter(
    (e) => e.frequency === "per_job" || e.frequency === "percent_revenue",
  );
  for (const e of revDependent) {
    const amount = e.amount;
    if (amount == null) continue;
    if (e.scope === "company") {
      for (const m of months) {
        if (!applies(e, null, m)) continue;
        if (e.frequency === "percent_revenue") record(e, null, m, pctOf(monthRevenue[m], amount));
        else if (monthJobs[m] != null) record(e, null, m, mul(amount, monthJobs[m]!));
        else lineFor(e).warnings.add("Per-job expense needs an average ticket (or production/lead mode) to count jobs.");
      }
    } else {
      for (const t of trucksForScope(scenario, e)) {
        const ti = trucks.indexOf(t);
        for (const m of months) {
          if (!applies(e, ti, m)) continue;
          const cell = tm[ti][m];
          if (e.frequency === "percent_revenue") record(e, ti, m, pctOf(cell.revenue, amount));
          else if (cell.jobs != null) record(e, ti, m, mul(amount, cell.jobs));
          else lineFor(e).warnings.add("Per-job expense needs an average ticket (or production/lead mode) to count jobs.");
        }
      }
    }
  }

  // Pass 4 — payroll-dependent expenses (% of payroll).
  const payrollDependent = configuredExpenses.filter((e) => e.frequency === "percent_payroll");
  for (const e of payrollDependent) {
    const pct = e.amount;
    if (pct == null) continue;
    if (e.scope === "company") {
      for (const m of months) {
        if (!applies(e, null, m)) continue;
        const payroll =
          companyByCategory[m].payroll + sum(trucks.map((_, ti) => tm[ti][m].byCategory.payroll));
        record(e, null, m, pctOf(payroll, pct));
      }
    } else {
      for (const t of trucksForScope(scenario, e)) {
        const ti = trucks.indexOf(t);
        for (const m of months) {
          if (!applies(e, ti, m)) continue;
          record(e, ti, m, pctOf(tm[ti][m].byCategory.payroll, pct));
        }
      }
    }
  }

  // Lines → results
  for (const e of scenario.expenses) {
    const l = lineFor(e);
    if (e.scope === "specific_truck" && !trucks.some((t) => t.id === e.truckId) && e.status === "configured") {
      l.warnings.add("Assigned truck no longer exists — this expense is not counted.");
    }
  }

  // Per-truck aggregation
  const truckResults: TruckResult[] = trucks.map((t, ti) => {
    const byCategory = zeroCategories();
    let revenueTotal = 0;
    for (const m of months) {
      const cell = tm[ti][m];
      cell.directOperating = operatingSum(cell.byCategory);
      cell.contribution = cell.revenue - cell.directOperating;
      revenueTotal += cell.revenue;
      addCategories(byCategory, cell.byCategory);
    }
    const directOperating = operatingSum(byCategory);
    const contribution = revenueTotal - directOperating;
    const activeMonthCount = truckActive[ti].filter(Boolean).length;
    return {
      truckId: t.id,
      name: t.name,
      operator: t.operator,
      startMonth: t.startMonth,
      acquisition: t.acquisition,
      activeMonthCount,
      months: tm[ti],
      lines: Array.from(truckLines[ti].values()).sort((a, b) => b.total - a.total),
      revenue: revenueTotal,
      byCategory,
      directOperating,
      contribution,
      contributionMarginPct: marginPct(contribution, revenueTotal),
      allocatedShared: 0,
      profitAfterAllocation: contribution,
      avgMonthlyRevenue: div(revenueTotal, activeMonthCount),
      avgMonthlyContribution: div(contribution, activeMonthCount),
    };
  });

  // Shared-cost allocation (truck view only — never changes company totals).
  if (scenario.allocation !== "none" && trucks.length > 0) {
    for (const m of months) {
      const shared = operatingSum(companyByCategory[m]);
      if (shared === 0) continue;
      const activeIdx = trucks.map((_, i) => i).filter((i) => truckActive[i][m]);
      const pool = activeIdx.length > 0 ? activeIdx : trucks.map((_, i) => i);
      if (scenario.allocation === "by_revenue" && monthRevenue[m] > 0) {
        let allocated = 0;
        pool.forEach((ti, k) => {
          const share =
            k === pool.length - 1 ? shared - allocated : mul(shared, tm[ti][m].revenue / monthRevenue[m]);
          allocated += share;
          truckResults[ti].allocatedShared += share;
        });
      } else {
        let allocated = 0;
        pool.forEach((ti, k) => {
          const share = k === pool.length - 1 ? shared - allocated : div(shared, pool.length);
          allocated += share;
          truckResults[ti].allocatedShared += share;
        });
      }
    }
    for (const tr of truckResults) tr.profitAfterAllocation = tr.contribution - tr.allocatedShared;
  }

  // Month aggregation
  let cumulativeOperatingProfit = 0;
  let cumulativeCashFlow = 0;
  const monthResults: MonthResult[] = months.map((m) => {
    const byCategory = zeroCategories();
    addCategories(byCategory, companyByCategory[m]);
    trucks.forEach((_, ti) => addCategories(byCategory, tm[ti][m].byCategory));
    const operatingExpenses = operatingSum(byCategory);
    const revenueM = monthRevenue[m];
    const operatingProfit = revenueM - operatingExpenses;
    const depreciation = byCategory.depreciation;
    const ebit = operatingProfit - depreciation;
    const interest = byCategory.interest;
    const pretaxProfit = ebit - interest;
    const taxes = scenario.taxRatePct == null ? null : pctOf(Math.max(0, pretaxProfit), scenario.taxRatePct);
    const netIncome = taxes == null ? null : pretaxProfit - taxes;
    const principal = byCategory.principal;
    const capex = capexByMonth[m];
    const financingProceeds = financingProceedsByMonth[m];
    const cashFlow = operatingProfit - interest - principal - capex + financingProceeds - (taxes ?? 0);
    cumulativeOperatingProfit += operatingProfit;
    cumulativeCashFlow += cashFlow;
    return {
      monthIndex: m,
      label: MONTH_LABELS[m],
      active: seasonActive[m],
      weeks: weeks[m],
      activeTrucks: trucks.filter((_, ti) => truckActive[ti][m]).length,
      revenue: revenueM,
      jobs: monthJobs[m],
      byCategory,
      operatingExpenses,
      operatingProfit,
      depreciation,
      ebit,
      interest,
      pretaxProfit,
      taxes,
      netIncome,
      principal,
      capex,
      financingProceeds,
      cashFlow,
      cumulativeOperatingProfit,
      cumulativeCashFlow,
      cashBalance: scenario.startingCash + cumulativeCashFlow,
    };
  });

  // Totals
  const byCategory = zeroCategories();
  for (const mr of monthResults) addCategories(byCategory, mr.byCategory);
  const revenueTotal = sum(monthRevenue);
  const operatingExpenses = operatingSum(byCategory);
  const operatingProfit = revenueTotal - operatingExpenses;
  const depreciation = byCategory.depreciation;
  const interest = byCategory.interest;
  const ebit = operatingProfit - depreciation;
  const pretaxProfit = ebit - interest;
  const taxes = scenario.taxRatePct == null ? null : sum(monthResults.map((x) => x.taxes ?? 0));
  const netIncome = taxes == null ? null : pretaxProfit - taxes;
  const principal = byCategory.principal;
  const capex = sum(capexByMonth);
  const financingProceeds = sum(financingProceedsByMonth);
  const cashFlow = sum(monthResults.map((x) => x.cashFlow));
  const truckContribution = sum(truckResults.map((t) => t.contribution));
  const sharedOperating = sum(companyByCategory.map(operatingSum));

  const totals: Totals = {
    revenue: revenueTotal,
    byCategory,
    operatingExpenses,
    operatingProfit,
    operatingMarginPct: marginPct(operatingProfit, revenueTotal),
    depreciation,
    ebit,
    interest,
    pretaxProfit,
    taxes,
    netIncome,
    principal,
    capex,
    financingProceeds,
    cashFlow,
    truckContribution,
    sharedOperating,
    payroll: byCategory.payroll,
    payrollBurden: byCategory.payroll_burden,
    advertising: byCategory.marketing,
    chemicals: byCategory.chemicals,
  };

  // Completeness (operating expenses only)
  const operatingExpensesList = scenario.expenses.filter((e) => isOperatingCategory(e.category));
  const notConfiguredList = operatingExpensesList.filter((e) => e.status === "not_configured");
  const completeness: Completeness = {
    total: operatingExpensesList.length,
    configured: operatingExpensesList.filter((e) => e.status === "configured").length,
    notConfigured: notConfiguredList.length,
    notApplicable: operatingExpensesList.filter((e) => e.status === "not_applicable").length,
    disabled: operatingExpensesList.filter((e) => e.status === "disabled").length,
    unconfiguredNames: notConfiguredList.map((e) => e.name),
    pct:
      operatingExpensesList.length === 0
        ? 100
        : Math.round(((operatingExpensesList.length - notConfiguredList.length) / operatingExpensesList.length) * 100),
  };

  // KPIs
  const activeMonthResults = monthResults.filter((x) => x.active);
  const operatingWeeks = sum(activeMonthResults.map((x) => x.weeks * 1000)) / 1000;
  const truckMonths = truckResults.reduce((a, t) => a + t.activeMonthCount, 0);
  const truckWeeks = trucks.reduce(
    (a, _, ti) => a + months.reduce((b, m) => b + (truckActive[ti][m] ? weeks[m] : 0), 0),
    0,
  );
  const hiredTrucks = trucks.filter((t) => t.operator === "hired").length;
  const ownerTrucks = trucks.length - hiredTrucks;
  const hasFinancing =
    capex > 0 || principal > 0 || interest > 0 ||
    scenario.expenses.some((e) => !isOperatingCategory(e.category) && e.status === "configured");

  const kpis: Kpis = {
    seasonalRevenue: revenueTotal,
    operatingExpenses,
    operatingProfit,
    operatingMarginPct: totals.operatingMarginPct,
    avgMonthlyRevenueInSeason: div(revenueTotal, operatingMonths),
    avgMonthlyProfitInSeason: div(sum(activeMonthResults.map((x) => x.operatingProfit)), operatingMonths),
    avgMonthlyProfitAllYear: div(operatingProfit, 12),
    totalPayroll: byCategory.payroll,
    totalAdvertising: byCategory.marketing,
    totalChemicals: byCategory.chemicals,
    profitPerTruck: div(operatingProfit, trucks.length),
    revenuePerTruck: div(revenueTotal, trucks.length),
    profitPerOperatingWeek: div(operatingProfit, operatingWeeks),
    activeTrucks: trucks.length,
    hiredTrucks,
    ownerTrucks,
    hiredEmployees: hiredTrucks * scenario.labor.crewsPerTruck * scenario.labor.employeesPerCrew,
    annualCashFlow: cashFlow,
    cashFlowConfigured: hasFinancing,
  };

  const totalJobs = monthJobs.some((j) => j != null) ? sum(monthJobs.map((j) => j ?? 0)) : null;
  const meta: EngineMeta = {
    operatingMonths,
    operatingWeeks,
    truckMonths,
    truckWeeks,
    weeksPerMonthAvg: operatingMonths > 0 ? operatingWeeks / operatingMonths : 0,
    revenueMode: rev.mode,
    totalJobs,
  };

  const lineResults: ExpenseLineResult[] = Array.from(lines.values()).map((l) => {
    const total = sum(l.monthly);
    return {
      expenseId: l.expenseId,
      catalogKey: l.catalogKey,
      name: l.name,
      category: l.category,
      status: l.status,
      scope: l.scope,
      frequency: l.frequency,
      timing: l.timing,
      amount: l.amount,
      monthly: l.monthly,
      total,
      shareOfRevenuePct: marginPct(total, revenueTotal),
      derived: l.derived,
      warnings: Array.from(l.warnings),
    };
  });
  for (const l of lineResults) for (const w of l.warnings) warn(`${l.name}: ${w}`);

  return {
    scenarioId: scenario.id,
    months: monthResults,
    trucks: truckResults,
    lines: lineResults,
    totals,
    kpis,
    completeness,
    meta,
    warnings,
  };
}
