import { contiguousSeason } from "./calendar";
import { defaultExpenses } from "./catalog";
import type {
  ExpansionConfig,
  FleetExpansionAssumptions,
  LaborConfig,
  RevenueConfig,
  Scenario,
  SeasonConfig,
  Truck,
} from "./types";

export const DEFAULT_SEASON_START = 3; // April
export const DEFAULT_SEASON_LENGTH = 7; // April – October

export const REVENUE_PRESETS = {
  conservative: 24_000_00,
  target: 34_000_00,
  aggressive: 44_000_00,
} as const;

export function defaultSeason(): SeasonConfig {
  return {
    activeMonths: contiguousSeason(DEFAULT_SEASON_START, DEFAULT_SEASON_LENGTH),
    monthMultipliers: new Array(12).fill(1),
    weeksMethod: "average",
  };
}

export function defaultRevenue(): RevenueConfig {
  return {
    mode: "manual",
    monthlyGrossPerTruck: REVENUE_PRESETS.target,
    avgTicket: null,
    jobsPerDay: 3,
    workingDaysPerWeek: 5,
    utilizationPct: 85,
    cancellationPct: 0,
    weatherDowntimePct: 0,
    costPerLead: null,
    leadToBookingPct: null,
  };
}

export function defaultLabor(): LaborConfig {
  return {
    payrollModel: "fixed_weekly",
    crewsPerTruck: 1,
    employeesPerCrew: 2,
    hoursPerWeekPerEmployee: 40,
    hourlyWage: 22_00,
  };
}

export function defaultExpansion(): ExpansionConfig {
  return {
    truckPrice: 45_000_00,
    equipmentCost: 18_000_00,
    trailerCost: 0,
    wrapCost: 4_000_00,
    initialChemicals: 2_500_00,
    hiringTraining: 2_000_00,
    startupAdvertising: 3_000_00,
    otherSetup: 1_000_00,
    downPaymentPct: 20,
    interestRatePct: 8,
    loanTermMonths: 60,
    financeEquipment: false,
    depreciationYears: 5,
    workingCapitalWeeks: 4,
  };
}

export function defaultFleetExpansion(): FleetExpansionAssumptions {
  return {
    operator: "hired",
    revenueBasis: "scenario_default",
    customMonthlyRevenue: REVENUE_PRESETS.target,
    includeCapital: false,
  };
}

export function makeTruck(index: number, operator: Truck["operator"], startMonth = DEFAULT_SEASON_START): Truck {
  return {
    id: `truck_${index + 1}`,
    name: `Truck ${index + 1}`,
    operator,
    startMonth,
    acquisition: "existing",
    overrides: {},
  };
}

export function defaultTrucks(total = 3, owner = 2, startMonth = DEFAULT_SEASON_START): Truck[] {
  const trucks: Truck[] = [];
  for (let i = 0; i < total; i++) {
    trucks.push(makeTruck(i, i < owner ? "owner" : "hired", startMonth));
  }
  return trucks;
}

export function createDefaultScenario(overrides: Partial<Scenario> = {}): Scenario {
  const now = new Date(0).toISOString();
  return {
    id: "baseline",
    name: "Baseline",
    description: "2 owner-operated + 1 hired-crew truck at $34K/month over a 7-month season.",
    preset: "target",
    createdAt: now,
    updatedAt: now,
    season: defaultSeason(),
    revenue: defaultRevenue(),
    labor: defaultLabor(),
    trucks: defaultTrucks(),
    expenses: defaultExpenses(),
    expansion: defaultExpansion(),
    fleetExpansion: defaultFleetExpansion(),
    allocation: "none",
    taxRatePct: null,
    startingCash: 0,
    ...overrides,
  };
}

export function createPresetScenario(preset: keyof typeof REVENUE_PRESETS): Scenario {
  const names = { conservative: "Conservative", target: "Target", aggressive: "Aggressive" };
  const descriptions = {
    conservative: "$24K gross per truck per month.",
    target: "$34K gross per truck per month.",
    aggressive: "$44K gross per truck per month.",
  };
  const s = createDefaultScenario({
    id: `preset_${preset}`,
    name: names[preset],
    description: descriptions[preset],
    preset,
  });
  s.revenue.monthlyGrossPerTruck = REVENUE_PRESETS[preset];
  s.fleetExpansion.customMonthlyRevenue = REVENUE_PRESETS[preset];
  return s;
}

/** Deep clone a scenario (structuredClone-safe plain data). */
export function cloneScenario(s: Scenario, patch: Partial<Scenario> = {}): Scenario {
  return { ...structuredClone(s), ...patch };
}
