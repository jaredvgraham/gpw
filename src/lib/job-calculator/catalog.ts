import type {
  Expense,
  ExpenseCategory,
  ExpenseScope,
  ExpenseTiming,
  Frequency,
} from "./types";

export interface CategoryMeta {
  key: ExpenseCategory;
  label: string;
  shortLabel: string;
  group: "operating" | "financing" | "non_cash";
  /** Position in the profitability waterfall (operating only). */
  waterfallOrder: number;
  description: string;
  color: string;
}

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  chemicals: {
    key: "chemicals",
    label: "Chemicals & Supplies",
    shortLabel: "Chemicals",
    group: "operating",
    waterfallOrder: 1,
    description: "Bleach, surfactants, consumables and job supplies.",
    color: "#f97316",
  },
  marketing: {
    key: "marketing",
    label: "Advertising & Acquisition",
    shortLabel: "Marketing",
    group: "operating",
    waterfallOrder: 2,
    description: "Paid advertising, lead generation and commissions.",
    color: "#fb7185",
  },
  payroll: {
    key: "payroll",
    label: "Crew Payroll",
    shortLabel: "Payroll",
    group: "operating",
    waterfallOrder: 3,
    description: "Wages for hired crews, managers and optional owner pay.",
    color: "#f43f5e",
  },
  payroll_burden: {
    key: "payroll_burden",
    label: "Payroll Burden",
    shortLabel: "Burden",
    group: "operating",
    waterfallOrder: 4,
    description: "Employer taxes, workers' comp and benefits.",
    color: "#e11d48",
  },
  vehicle: {
    key: "vehicle",
    label: "Vehicle Operating",
    shortLabel: "Vehicle",
    group: "operating",
    waterfallOrder: 5,
    description: "Truck fuel, insurance, registration and trailers.",
    color: "#f59e0b",
  },
  equipment: {
    key: "equipment",
    label: "Maintenance & Equipment",
    shortLabel: "Equipment",
    group: "operating",
    waterfallOrder: 6,
    description: "Maintenance, repairs, equipment insurance and reserves.",
    color: "#d97706",
  },
  fixed: {
    key: "fixed",
    label: "Fixed Expenses",
    shortLabel: "Fixed",
    group: "operating",
    waterfallOrder: 7,
    description: "Rent, business insurance, phones, software, utilities.",
    color: "#a855f7",
  },
  overhead: {
    key: "overhead",
    label: "Company Overhead",
    shortLabel: "Overhead",
    group: "operating",
    waterfallOrder: 8,
    description: "Bookkeeping, accounting, legal, admin staff.",
    color: "#8b5cf6",
  },
  interest: {
    key: "interest",
    label: "Financing Interest",
    shortLabel: "Interest",
    group: "financing",
    waterfallOrder: 90,
    description: "Interest on truck and equipment loans (below EBIT).",
    color: "#64748b",
  },
  principal: {
    key: "principal",
    label: "Loan Principal",
    shortLabel: "Principal",
    group: "financing",
    waterfallOrder: 91,
    description: "Principal repayment — affects cash flow, not profit.",
    color: "#475569",
  },
  depreciation: {
    key: "depreciation",
    label: "Depreciation",
    shortLabel: "Depreciation",
    group: "non_cash",
    waterfallOrder: 92,
    description: "Non-cash write-down of trucks and equipment.",
    color: "#94a3b8",
  },
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "per week",
  monthly: "per month",
  yearly: "per year",
  per_job: "per job",
  percent_revenue: "% of revenue",
  percent_payroll: "% of payroll",
};

export const SCOPE_LABEL: Record<ExpenseScope, string> = {
  all_trucks: "Every truck",
  hired_trucks: "Hired-crew trucks",
  owner_trucks: "Owner-operated trucks",
  specific_truck: "Specific truck",
  company: "Company-wide",
};

export const TIMING_LABEL: Record<ExpenseTiming, string> = {
  season: "Operating season only",
  year_round: "Year-round",
  off_season: "Off-season only",
};

export interface CatalogItem {
  key: string;
  name: string;
  category: ExpenseCategory;
  frequency: Frequency;
  scope: ExpenseScope;
  timing: ExpenseTiming;
  /** Default amount in cents (or percent for percent_* frequencies). */
  defaultAmount?: number;
  hint?: string;
}

/**
 * The default expense catalog. Only bleach, advertising and crew payroll are
 * prepopulated with known amounts; everything else starts "not configured".
 */
export const EXPENSE_CATALOG: CatalogItem[] = [
  // Chemicals & supplies
  { key: "bleach", name: "Bleach / chemicals", category: "chemicals", frequency: "weekly", scope: "all_trucks", timing: "season", defaultAmount: 130_000 },
  { key: "other_chemicals", name: "Other cleaning chemicals", category: "chemicals", frequency: "weekly", scope: "all_trucks", timing: "season" },
  { key: "surfactants", name: "Surfactants", category: "chemicals", frequency: "weekly", scope: "all_trucks", timing: "season" },
  { key: "equipment_fuel", name: "Fuel for equipment", category: "chemicals", frequency: "weekly", scope: "all_trucks", timing: "season" },
  { key: "hoses_fittings", name: "Hoses & fittings", category: "chemicals", frequency: "monthly", scope: "all_trucks", timing: "season" },
  { key: "tips_nozzles", name: "Tips & nozzles", category: "chemicals", frequency: "monthly", scope: "all_trucks", timing: "season" },
  { key: "job_supplies", name: "General job supplies", category: "chemicals", frequency: "weekly", scope: "all_trucks", timing: "season" },
  { key: "ppe", name: "Protective equipment", category: "chemicals", frequency: "monthly", scope: "all_trucks", timing: "season" },
  { key: "other_consumables", name: "Other consumables", category: "chemicals", frequency: "weekly", scope: "all_trucks", timing: "season" },

  // Marketing
  { key: "advertising", name: "Advertising", category: "marketing", frequency: "weekly", scope: "all_trucks", timing: "season", defaultAmount: 85_000 },
  { key: "video_production", name: "Video production", category: "marketing", frequency: "monthly", scope: "company", timing: "season" },
  { key: "agency_fees", name: "Marketing agency fees", category: "marketing", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "website", name: "Website costs", category: "marketing", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "crm", name: "CRM costs", category: "marketing", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "lead_gen_services", name: "Lead generation services", category: "marketing", frequency: "monthly", scope: "company", timing: "season" },
  { key: "referral_commissions", name: "Referral commissions", category: "marketing", frequency: "percent_revenue", scope: "all_trucks", timing: "season" },
  { key: "sales_commissions", name: "Sales commissions", category: "marketing", frequency: "percent_revenue", scope: "all_trucks", timing: "season" },

  // Labor
  { key: "crew_payroll", name: "Hired-crew payroll", category: "payroll", frequency: "weekly", scope: "hired_trucks", timing: "season", defaultAmount: 175_000, hint: "Weekly crew wages per hired truck. Switch to the hourly model to derive this from employees × hours × wage." },
  { key: "owner_compensation", name: "Owner compensation", category: "payroll", frequency: "weekly", scope: "owner_trucks", timing: "season", hint: "Optional pay for owner-operators. Leave not configured to see owner profit before draws." },
  { key: "managers", name: "Managers & supervisors", category: "payroll", frequency: "monthly", scope: "company", timing: "season" },
  { key: "overtime", name: "Overtime", category: "payroll", frequency: "weekly", scope: "hired_trucks", timing: "season" },
  { key: "bonuses", name: "Performance bonuses", category: "payroll", frequency: "percent_revenue", scope: "hired_trucks", timing: "season" },
  { key: "recruiting", name: "Recruiting", category: "payroll", frequency: "yearly", scope: "company", timing: "year_round" },
  { key: "training", name: "Training", category: "payroll", frequency: "yearly", scope: "company", timing: "year_round" },

  // Payroll burden
  { key: "payroll_taxes", name: "Payroll taxes", category: "payroll_burden", frequency: "percent_payroll", scope: "hired_trucks", timing: "season", hint: "Employer FICA/FUTA/SUTA, typically 8–12% of wages." },
  { key: "workers_comp", name: "Workers' compensation", category: "payroll_burden", frequency: "percent_payroll", scope: "hired_trucks", timing: "season" },
  { key: "benefits", name: "Employee benefits", category: "payroll_burden", frequency: "monthly", scope: "hired_trucks", timing: "season" },

  // Vehicle
  { key: "truck_insurance", name: "Truck insurance", category: "vehicle", frequency: "monthly", scope: "all_trucks", timing: "year_round" },
  { key: "truck_fuel", name: "Truck fuel", category: "vehicle", frequency: "weekly", scope: "all_trucks", timing: "season" },
  { key: "registration", name: "Registration", category: "vehicle", frequency: "yearly", scope: "all_trucks", timing: "year_round" },
  { key: "trailer", name: "Trailer expenses", category: "vehicle", frequency: "monthly", scope: "all_trucks", timing: "year_round" },

  // Equipment
  { key: "equipment_insurance", name: "Equipment insurance", category: "equipment", frequency: "monthly", scope: "all_trucks", timing: "year_round" },
  { key: "maintenance", name: "Maintenance", category: "equipment", frequency: "monthly", scope: "all_trucks", timing: "season" },
  { key: "repairs", name: "Repairs", category: "equipment", frequency: "monthly", scope: "all_trucks", timing: "season" },
  { key: "replacement_reserve", name: "Equipment replacement reserve", category: "equipment", frequency: "monthly", scope: "all_trucks", timing: "season" },

  // Fixed
  { key: "business_insurance", name: "Business insurance", category: "fixed", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "rent", name: "Office / storage rent", category: "fixed", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "phones", name: "Phones", category: "fixed", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "software", name: "Software subscriptions", category: "fixed", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "utilities", name: "Utilities", category: "fixed", frequency: "monthly", scope: "company", timing: "year_round" },

  // Overhead
  { key: "bookkeeping", name: "Bookkeeping", category: "overhead", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "accounting", name: "Accounting", category: "overhead", frequency: "yearly", scope: "company", timing: "year_round" },
  { key: "legal", name: "Legal", category: "overhead", frequency: "yearly", scope: "company", timing: "year_round" },
  { key: "admin_staff", name: "Administrative employees", category: "overhead", frequency: "monthly", scope: "company", timing: "year_round" },
  { key: "other_overhead", name: "Other overhead", category: "overhead", frequency: "monthly", scope: "company", timing: "year_round" },

  // Financing / non-cash for existing fleet (new trucks are derived automatically)
  { key: "existing_interest", name: "Truck financing interest (existing fleet)", category: "interest", frequency: "monthly", scope: "all_trucks", timing: "year_round", hint: "Interest on loans for trucks you already own. New-truck financing is calculated automatically from expansion settings." },
  { key: "existing_principal", name: "Truck loan principal (existing fleet)", category: "principal", frequency: "monthly", scope: "all_trucks", timing: "year_round", hint: "Cash-flow only — never reduces operating profit." },
  { key: "existing_depreciation", name: "Depreciation (existing fleet)", category: "depreciation", frequency: "monthly", scope: "all_trucks", timing: "year_round", hint: "Non-cash. Reduces EBIT, not cash flow." },
];

export function catalogItem(key: string): CatalogItem | undefined {
  return EXPENSE_CATALOG.find((c) => c.key === key);
}

export function expenseFromCatalog(item: CatalogItem): Expense {
  const configured = item.defaultAmount !== undefined;
  return {
    id: `exp_${item.key}`,
    catalogKey: item.key,
    name: item.name,
    category: item.category,
    status: configured ? "configured" : "not_configured",
    amount: configured ? item.defaultAmount! : null,
    frequency: item.frequency,
    scope: item.scope,
    timing: item.timing,
    notes: item.hint,
  };
}

export function defaultExpenses(): Expense[] {
  return EXPENSE_CATALOG.map(expenseFromCatalog);
}
