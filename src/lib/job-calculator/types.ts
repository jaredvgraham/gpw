import type { Cents } from "./money";

// ---------------------------------------------------------------------------
// Expense model
// ---------------------------------------------------------------------------

/**
 * Operating categories flow through the profitability waterfall in this order.
 * Non-operating categories (interest, principal, depreciation) are tracked
 * separately so operating profit, EBIT, pretax profit and cash flow stay distinct.
 */
export type OperatingCategory =
  | "chemicals"
  | "marketing"
  | "payroll"
  | "payroll_burden"
  | "vehicle"
  | "equipment"
  | "fixed"
  | "overhead";

export type NonOperatingCategory = "interest" | "principal" | "depreciation";

export type ExpenseCategory = OperatingCategory | NonOperatingCategory;

export const OPERATING_CATEGORIES: OperatingCategory[] = [
  "chemicals",
  "marketing",
  "payroll",
  "payroll_burden",
  "vehicle",
  "equipment",
  "fixed",
  "overhead",
];

export const NON_OPERATING_CATEGORIES: NonOperatingCategory[] = [
  "interest",
  "principal",
  "depreciation",
];

export const ALL_CATEGORIES: ExpenseCategory[] = [
  ...OPERATING_CATEGORIES,
  ...NON_OPERATING_CATEGORIES,
];

/**
 * How an amount is normalized to a month:
 *  - weekly:          amount × weeks in month
 *  - monthly:         amount
 *  - yearly:          amount ÷ number of applicable months
 *  - per_job:         amount × completed jobs (requires job count)
 *  - percent_revenue: amount is a percent (e.g. 5 = 5%) of gross revenue
 *  - percent_payroll: amount is a percent of hired-crew payroll
 */
export type Frequency =
  | "weekly"
  | "monthly"
  | "yearly"
  | "per_job"
  | "percent_revenue"
  | "percent_payroll";

/** Which trucks an expense applies to. `company` is a shared, non-truck cost. */
export type ExpenseScope =
  | "all_trucks"
  | "hired_trucks"
  | "owner_trucks"
  | "specific_truck"
  | "company";

/** When the expense is incurred relative to the operating season. */
export type ExpenseTiming = "season" | "year_round" | "off_season";

/**
 *  configured      – amount is known and included
 *  not_configured  – unknown; excluded from totals and flagged as incomplete
 *  not_applicable  – explicitly confirmed as $0 / N/A; excluded, not flagged
 *  disabled        – temporarily turned off; excluded, not flagged
 */
export type ExpenseStatus =
  | "configured"
  | "not_configured"
  | "not_applicable"
  | "disabled";

export interface Expense {
  id: string;
  /** Stable key for catalog items (e.g. "bleach", "advertising", "crew_payroll"). */
  catalogKey?: string;
  name: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  /**
   * For weekly/monthly/yearly/per_job: integer cents.
   * For percent_* frequencies: percent value (5 = 5%).
   * null when not configured.
   */
  amount: number | null;
  frequency: Frequency;
  scope: ExpenseScope;
  /** Required when scope === "specific_truck". */
  truckId?: string;
  timing: ExpenseTiming;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Fleet model
// ---------------------------------------------------------------------------

export type OperatorType = "owner" | "hired";

export interface TruckOverrides {
  /** Gross monthly revenue override (cents), replaces scenario default. */
  monthlyRevenue?: Cents | null;
  /** Multiplier on whatever revenue the truck would otherwise produce. */
  performanceMultiplier?: number;
  /** Weekly chemical (bleach) override. */
  weeklyChemicals?: Cents | null;
  /** Weekly advertising override. */
  weeklyAdvertising?: Cents | null;
  /** Weekly crew payroll override (hired trucks only). */
  weeklyPayroll?: Cents | null;
  /**
   * Jobs this truck finishes on a working day. Null follows the scenario
   * jobs-per-day. Each owner-operated truck can keep its own schedule.
   */
  jobsPerDay?: number | null;
}

export interface Truck {
  id: string;
  name: string;
  operator: OperatorType;
  /**
   * Calendar month (0 = Jan … 11 = Dec) the truck enters service. The truck
   * only earns revenue in active season months on or after this month.
   */
  startMonth: number;
  /**
   * "existing" trucks are already owned. "new" trucks trigger expansion
   * capital, financing, startup costs and depreciation at `startMonth`.
   */
  acquisition: "existing" | "new";
  overrides: TruckOverrides;
}

// ---------------------------------------------------------------------------
// Season / calendar
// ---------------------------------------------------------------------------

export type WeeksMethod = "average" | "calendar";

export interface SeasonConfig {
  /** 12 booleans, index 0 = January. */
  activeMonths: boolean[];
  /** 12 multipliers applied to per-truck revenue (1 = no change). */
  monthMultipliers: number[];
  /**
   * average  – every month has 52/12 ≈ 4.333 weeks
   * calendar – each month has daysInMonth / 7 weeks (non-leap year)
   */
  weeksMethod: WeeksMethod;
}

// ---------------------------------------------------------------------------
// Revenue model
// ---------------------------------------------------------------------------

export type RevenueMode = "manual" | "production" | "lead";

export interface RevenueConfig {
  mode: RevenueMode;
  /** Manual mode: gross revenue per truck per operating month (cents). */
  monthlyGrossPerTruck: Cents;
  /** Average job ticket (cents). Null = not configured. */
  avgTicket: Cents | null;
  jobsPerDay: number;
  workingDaysPerWeek: number;
  /** 0–100 */
  utilizationPct: number;
  /** 0–100 share of booked jobs that cancel. */
  cancellationPct: number;
  /** 0–100 share of working days lost to weather. */
  weatherDowntimePct: number;
  /** Lead mode: cost per lead (cents). Null = not configured. */
  costPerLead: Cents | null;
  /** Lead mode: 0–100 lead → booking conversion. Null = not configured. */
  leadToBookingPct: number | null;
}

// ---------------------------------------------------------------------------
// Labor model
// ---------------------------------------------------------------------------

export type PayrollModel = "fixed_weekly" | "hourly";

export interface LaborConfig {
  payrollModel: PayrollModel;
  crewsPerTruck: number;
  employeesPerCrew: number;
  /** Hourly model inputs */
  hoursPerWeekPerEmployee: number;
  hourlyWage: Cents;
}

// ---------------------------------------------------------------------------
// Expansion / capital
// ---------------------------------------------------------------------------

export interface ExpansionConfig {
  truckPrice: Cents;
  equipmentCost: Cents;
  trailerCost: Cents;
  wrapCost: Cents;
  initialChemicals: Cents;
  hiringTraining: Cents;
  startupAdvertising: Cents;
  otherSetup: Cents;
  /** 0–100 */
  downPaymentPct: number;
  /** Annual percentage rate, 0–100 */
  interestRatePct: number;
  loanTermMonths: number;
  financeEquipment: boolean;
  depreciationYears: number;
  /** Weeks of operating expenses held as working capital per new truck. */
  workingCapitalWeeks: number;
}

/** Assumptions used when the scaling simulator adds hypothetical trucks. */
export interface FleetExpansionAssumptions {
  operator: OperatorType;
  revenueBasis: "scenario_default" | "fleet_average" | "custom";
  customMonthlyRevenue: Cents;
  includeCapital: boolean;
}

export type AllocationMethod = "none" | "even" | "by_revenue";

// ---------------------------------------------------------------------------
// Scenario (the full set of assumptions)
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  preset?: "conservative" | "target" | "aggressive";
  createdAt: string;
  updatedAt: string;
  season: SeasonConfig;
  revenue: RevenueConfig;
  labor: LaborConfig;
  trucks: Truck[];
  expenses: Expense[];
  expansion: ExpansionConfig;
  fleetExpansion: FleetExpansionAssumptions;
  /** How shared company costs are allocated in the per-truck view. */
  allocation: AllocationMethod;
  /** Income tax rate (0–100) or null when not configured. */
  taxRatePct: number | null;
  startingCash: Cents;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type CategoryTotals = Record<ExpenseCategory, Cents>;

export interface TruckMonth {
  monthIndex: number;
  active: boolean;
  weeks: number;
  revenue: Cents;
  jobs: number | null;
  leads: number | null;
  bookings: number | null;
  capacityJobs: number | null;
  byCategory: CategoryTotals;
  directOperating: Cents;
  contribution: Cents;
}

export interface TruckLine {
  expenseId: string;
  catalogKey?: string;
  name: string;
  category: ExpenseCategory;
  total: Cents;
}

export interface TruckResult {
  truckId: string;
  name: string;
  operator: OperatorType;
  startMonth: number;
  acquisition: "existing" | "new";
  activeMonthCount: number;
  months: TruckMonth[];
  /** Seasonal totals of every expense line charged directly to this truck. */
  lines: TruckLine[];
  revenue: Cents;
  byCategory: CategoryTotals;
  directOperating: Cents;
  contribution: Cents;
  contributionMarginPct: number | null;
  allocatedShared: Cents;
  profitAfterAllocation: Cents;
  /** Average over active months */
  avgMonthlyRevenue: Cents;
  avgMonthlyContribution: Cents;
}

export interface MonthResult {
  monthIndex: number;
  label: string;
  active: boolean;
  weeks: number;
  activeTrucks: number;
  revenue: Cents;
  jobs: number | null;
  byCategory: CategoryTotals;
  operatingExpenses: Cents;
  operatingProfit: Cents;
  depreciation: Cents;
  ebit: Cents;
  interest: Cents;
  pretaxProfit: Cents;
  taxes: Cents | null;
  netIncome: Cents | null;
  principal: Cents;
  capex: Cents;
  financingProceeds: Cents;
  cashFlow: Cents;
  cumulativeOperatingProfit: Cents;
  cumulativeCashFlow: Cents;
  cashBalance: Cents;
}

export interface ExpenseLineResult {
  expenseId: string;
  catalogKey?: string;
  name: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  scope: ExpenseScope;
  frequency: Frequency;
  timing: ExpenseTiming;
  amount: number | null;
  monthly: Cents[];
  total: Cents;
  shareOfRevenuePct: number | null;
  /** True when generated by the engine (e.g. startup costs, financing). */
  derived: boolean;
  warnings: string[];
}

export interface Completeness {
  total: number;
  configured: number;
  notConfigured: number;
  notApplicable: number;
  disabled: number;
  unconfiguredNames: string[];
  /** 0–100 */
  pct: number;
}

export interface Totals {
  revenue: Cents;
  byCategory: CategoryTotals;
  operatingExpenses: Cents;
  operatingProfit: Cents;
  operatingMarginPct: number | null;
  depreciation: Cents;
  ebit: Cents;
  interest: Cents;
  pretaxProfit: Cents;
  taxes: Cents | null;
  netIncome: Cents | null;
  principal: Cents;
  capex: Cents;
  financingProceeds: Cents;
  cashFlow: Cents;
  /** Sum of truck-level contribution (before shared costs). */
  truckContribution: Cents;
  sharedOperating: Cents;
  /** Shortcut totals */
  payroll: Cents;
  payrollBurden: Cents;
  advertising: Cents;
  chemicals: Cents;
}

export interface Kpis {
  seasonalRevenue: Cents;
  operatingExpenses: Cents;
  operatingProfit: Cents;
  operatingMarginPct: number | null;
  avgMonthlyRevenueInSeason: Cents;
  avgMonthlyProfitInSeason: Cents;
  avgMonthlyProfitAllYear: Cents;
  totalPayroll: Cents;
  totalAdvertising: Cents;
  totalChemicals: Cents;
  profitPerTruck: Cents;
  revenuePerTruck: Cents;
  profitPerOperatingWeek: Cents;
  activeTrucks: number;
  hiredTrucks: number;
  ownerTrucks: number;
  hiredEmployees: number;
  annualCashFlow: Cents;
  cashFlowConfigured: boolean;
}

export interface EngineMeta {
  operatingMonths: number;
  operatingWeeks: number;
  truckMonths: number;
  truckWeeks: number;
  weeksPerMonthAvg: number;
  revenueMode: RevenueMode;
  totalJobs: number | null;
}

export interface Results {
  scenarioId: string;
  months: MonthResult[];
  trucks: TruckResult[];
  lines: ExpenseLineResult[];
  totals: Totals;
  kpis: Kpis;
  completeness: Completeness;
  meta: EngineMeta;
  warnings: string[];
}
