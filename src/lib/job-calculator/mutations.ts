import { firstActiveMonth } from "./calendar";
import { cloneScenario, makeTruck } from "./defaults";
import type { Cents } from "./money";
import type { OperatorType, Scenario, Truck } from "./types";

/** Average base monthly revenue across the configured fleet (manual-mode basis). */
export function fleetAverageMonthlyRevenue(s: Scenario): Cents {
  if (s.trucks.length === 0) return s.revenue.monthlyGrossPerTruck;
  const total = s.trucks.reduce(
    (a, t) => a + (t.overrides.monthlyRevenue ?? s.revenue.monthlyGrossPerTruck),
    0,
  );
  return Math.round(total / s.trucks.length);
}

function nextTruckIndex(trucks: Truck[]): number {
  let max = 0;
  for (const t of trucks) {
    const m = /^truck_(\d+)$/.exec(t.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max; // makeTruck(index) names index+1
}

/**
 * Create a hypothetical truck that follows the scenario's fleet-expansion
 * assumptions. Used by the scaling simulator and the profit-target solver.
 */
export function hypotheticalTruck(s: Scenario, index: number, operator?: OperatorType): Truck {
  const fx = s.fleetExpansion;
  const t = makeTruck(index, operator ?? fx.operator, firstActiveMonth(s.season));
  t.acquisition = fx.includeCapital ? "new" : "existing";
  if (fx.revenueBasis === "fleet_average") t.overrides.monthlyRevenue = fleetAverageMonthlyRevenue(s);
  else if (fx.revenueBasis === "custom") t.overrides.monthlyRevenue = fx.customMonthlyRevenue;
  return t;
}

/** Return a scenario with exactly `n` trucks. Extra trucks use expansion assumptions. */
export function withTruckCount(s: Scenario, n: number, operator?: OperatorType): Scenario {
  const target = Math.max(0, Math.round(n));
  if (target === s.trucks.length) return s;
  const next = cloneScenario(s);
  if (target < next.trucks.length) {
    next.trucks = next.trucks.slice(0, target);
    return next;
  }
  let idx = nextTruckIndex(next.trucks);
  while (next.trucks.length < target) {
    next.trucks.push(hypotheticalTruck(s, idx++, operator));
  }
  return next;
}

/** Set how many trucks (from the front of the list) are owner-operated. */
export function withOwnerCount(s: Scenario, owners: number): Scenario {
  const next = cloneScenario(s);
  const k = Math.max(0, Math.min(next.trucks.length, Math.round(owners)));
  next.trucks = next.trucks.map((t, i) => ({ ...t, operator: i < k ? "owner" : "hired" }));
  return next;
}

/** Add a new (financed) truck entering service in a given month. */
export function addNewTruck(s: Scenario, startMonth: number, operator: OperatorType = "hired"): Scenario {
  const next = cloneScenario(s);
  const t = makeTruck(nextTruckIndex(next.trucks), operator, startMonth);
  t.acquisition = "new";
  next.trucks.push(t);
  return next;
}

export function removeTruck(s: Scenario, truckId: string): Scenario {
  const next = cloneScenario(s);
  next.trucks = next.trucks.filter((t) => t.id !== truckId);
  next.expenses = next.expenses.filter((e) => !(e.scope === "specific_truck" && e.truckId === truckId));
  return next;
}

/** Uniform revenue per truck (clears per-truck overrides). */
export function withUniformRevenue(s: Scenario, monthlyGross: Cents): Scenario {
  const next = cloneScenario(s);
  next.revenue.mode = "manual";
  next.revenue.monthlyGrossPerTruck = monthlyGross;
  next.trucks = next.trucks.map((t) => ({
    ...t,
    overrides: { ...t.overrides, monthlyRevenue: null, performanceMultiplier: 1 },
  }));
  return next;
}

/** Scale an expense's amount by a factor (only when configured). */
export function withExpenseScaled(s: Scenario, catalogKey: string, factor: number): Scenario {
  const next = cloneScenario(s);
  for (const e of next.expenses) {
    if (e.catalogKey === catalogKey && e.status === "configured" && e.amount != null) {
      e.amount = Math.round(e.amount * factor);
    }
  }
  return next;
}

export function withExpenseDelta(s: Scenario, catalogKey: string, delta: number): Scenario {
  const next = cloneScenario(s);
  for (const e of next.expenses) {
    if (e.catalogKey === catalogKey && e.status === "configured" && e.amount != null) {
      e.amount = Math.max(0, e.amount + delta);
    }
  }
  return next;
}

export function touch(s: Scenario): Scenario {
  return { ...s, updatedAt: new Date().toISOString() };
}
