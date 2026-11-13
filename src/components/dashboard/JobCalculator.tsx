"use client";

import {
  applyCalculator,
  readCalculator,
  type CalculatorInput,
} from "@/lib/job-calculator/calculator";
import { computeResults } from "@/lib/job-calculator/calculate";
import { createDefaultScenario } from "@/lib/job-calculator/defaults";
import { mul } from "@/lib/job-calculator/money";
import type { Results, Scenario, TruckResult } from "@/lib/job-calculator/types";
import { fmtMoney, fmtMoneyExact, fmtNum, parseMoneyInput } from "@/lib/job-calculator/format";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "gpw-job-calculator-v1";
const serverScenario = createDefaultScenario();
const listeners = new Set<() => void>();
let memory: { raw: string | null; scenario: Scenario } | null = null;

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function readScenario(): Scenario {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (memory && memory.raw === raw) return memory.scenario;
  let scenario = serverScenario;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Scenario;
      if (parsed?.revenue && Array.isArray(parsed.trucks)) scenario = parsed;
    } catch {
      scenario = createDefaultScenario();
    }
  }
  memory = { raw, scenario };
  return scenario;
}

function emitScenario() {
  listeners.forEach((listener) => listener());
}

function saveScenario(next: Scenario) {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* storage unavailable */
  }
  memory = { raw, scenario: next };
  emitScenario();
}

function useSavedScenario() {
  const working = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readScenario,
    () => serverScenario,
  );
  return { working, setWorking: saveScenario };
}

const fieldClass =
  "w-full rounded-lg border border-brand-border bg-white text-right text-brand-black tabular-nums outline-none transition placeholder:text-gray-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

function MoneyInput({
  value, onChange, placeholder = "0",
}: {
  value: number | null;
  onChange: (cents: number | null) => void;
  placeholder?: string;
}) {
  const fmt = (v: number | null) => (v == null ? "" : (v / 100).toLocaleString("en-US", { maximumFractionDigits: 2 }));
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setText(fmt(value));
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const parsed = parseMoneyInput(next);
          if (parsed != null) onChange(Math.max(0, parsed));
          else if (next.trim() === "") onChange(null);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const parsed = parseMoneyInput(text);
          if (parsed == null) {
            onChange(null);
            setText("");
            return;
          }
          const next = Math.max(0, parsed);
          onChange(next);
          setText(fmt(next));
        }}
        className={cx(fieldClass, "h-9 pl-6 pr-2 text-sm")}
      />
    </div>
  );
}

function NumberInput({
  value, onChange, min, max, className,
}: {
  value: number;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setText(String(value));
  }
  const commitLive = (raw: string) => {
    const cleaned = raw.replace(/[,%\s]/g, "");
    if (cleaned === "") return;
    let n = parseFloat(cleaned);
    if (!Number.isFinite(n)) return;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    onChange(n);
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        commitLive(e.target.value);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const cleaned = text.replace(/[,%\s]/g, "");
        if (cleaned === "" || !Number.isFinite(parseFloat(cleaned))) {
          setText(String(value));
          return;
        }
        let n = parseFloat(cleaned);
        if (min != null) n = Math.max(min, n);
        if (max != null) n = Math.min(max, n);
        onChange(n);
        setText(String(n));
      }}
      className={cx(fieldClass, "h-9 px-2 text-sm", className)}
    />
  );
}

function jobsOf(truck: TruckResult): number {
  return truck.months.reduce((sum, m) => sum + (m.jobs ?? 0), 0);
}

function lineOf(truck: TruckResult, key: string): number {
  return truck.lines.filter((l) => l.catalogKey === key).reduce((sum, l) => sum + l.total, 0);
}

function companyLine(r: Results, key: string): number {
  return r.lines.filter((l) => l.catalogKey === key).reduce((sum, l) => sum + l.total, 0);
}

function YearStack({ form, results, otherCosts }: { form: CalculatorInput; results: Results; otherCosts: number }) {
  const jobs = results.meta.totalJobs ?? 0;
  const hired = form.hiredTrucks;
  const owners = form.trucks - hired;
  const weeks = results.meta.weeksPerMonthAvg;
  const lines: { label: string; amount: number; how: string }[] = [];
  lines.push({
    label: "Customers pay",
    amount: results.totals.revenue,
    how: form.ticket != null && jobs > 0 ? `${fmtMoneyExact(form.ticket)} × ${fmtCount(jobs)} jobs across ${form.trucks} truck${form.trucks === 1 ? "" : "s"}` : "Enter a price per job",
  });
  const pushCost = (label: string, amount: number, how: string) => {
    if (amount > 0) lines.push({ label, amount: -amount, how });
  };
  pushCost("Chemicals & supplies", companyLine(results, "bleach"), form.suppliesPerJob != null ? `${fmtMoneyExact(form.suppliesPerJob)} per job × ${fmtCount(jobs)} jobs` : "Per job");
  pushCost(form.trucks === 1 ? "Fuel" : `Fuel · ${form.trucks} trucks`, companyLine(results, "truck_fuel"), form.fuelPerDay != null ? `${fmtMoneyExact(form.fuelPerDay)} a day per truck × ${form.daysPerWeek} days × ${weeks.toFixed(2)} weeks × ${form.months} months × ${form.trucks} trucks` : "Per truck, per day");
  pushCost(hired === 1 ? "Crew payroll" : `Crew payroll · ${hired} hired trucks`, companyLine(results, "crew_payroll"), form.payrollPerDay != null ? `${fmtMoneyExact(form.payrollPerDay)} a day per hired truck × ${form.daysPerWeek} days × ${weeks.toFixed(2)} weeks × ${form.months} months × ${hired} hired truck${hired === 1 ? "" : "s"}` : "Per hired truck");
  pushCost(owners === 1 ? "Your pay" : `Your pay · ${owners} trucks`, companyLine(results, "owner_compensation"), form.ownerPayPerDay != null ? `${fmtMoneyExact(form.ownerPayPerDay)} a day per truck you drive × ${form.daysPerWeek} days × ${weeks.toFixed(2)} weeks × ${form.months} months × ${owners} truck${owners === 1 ? "" : "s"}` : "Per truck you drive");
  pushCost(form.trucks === 1 ? "Advertising" : `Advertising · ${form.trucks} trucks`, companyLine(results, "advertising"), form.adsPerWeek != null ? `${fmtMoneyExact(form.adsPerWeek)} a week per truck × ${weeks.toFixed(2)} weeks × ${form.months} months × ${form.trucks} trucks` : "Per truck, per week");
  pushCost(form.trucks === 1 ? "Truck insurance" : `Truck insurance · ${form.trucks} trucks`, companyLine(results, "truck_insurance"), form.insurancePerMonth != null ? `${fmtMoneyExact(form.insurancePerMonth)} a month per truck × 12 months × ${form.trucks} trucks` : "Per truck, every month");
  pushCost("Rent · company", companyLine(results, "rent"), form.rentPerMonth != null ? `${fmtMoneyExact(form.rentPerMonth)} a month × 12 months, once for the company` : "Once for the company");
  if (otherCosts > 0) pushCost("Other costs already saved", otherCosts, "Entered outside this calculator");
  lines.push({ label: "Profit", amount: results.totals.operatingProfit, how: `${fmtMoney(results.totals.revenue)} in − ${fmtMoney(results.totals.operatingExpenses)} out` });

  return (
    <div className="flex flex-col flex-1 justify-between min-h-0">
      {lines.map((line, i) => {
        const last = i === lines.length - 1;
        return (
          <div key={line.label} title={line.how} className={cx("flex items-baseline justify-between gap-3 py-1", last && "border-t border-brand-border mt-1 pt-2")}>
            <div className={cx("text-sm truncate", last ? "font-semibold text-brand-black" : "text-gray-600")}>{line.label}</div>
            <div className={cx("tabular-nums text-sm shrink-0", last ? cx("font-semibold", line.amount >= 0 ? "text-green-600" : "text-brand-red") : line.amount < 0 ? "text-brand-red" : "text-brand-blue")}>
              {line.amount < 0 ? `−${fmtMoneyExact(-line.amount)}` : fmtMoneyExact(line.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtCount(n: number): string {
  const digits = Math.abs(n - Math.round(n)) < 0.05 ? 0 : 1;
  return fmtNum(n, digits);
}

interface Slice {
  jobs: number;
  days: number;
  revenue: number;
  chem: number;
  fuel: number;
  payroll: number;
  ads: number;
  insurance: number;
  other: number;
  profit: number;
}

function sliceOf(partial: Omit<Slice, "other" | "profit"> & { costs: number; profit: number }): Slice {
  const known = partial.chem + partial.fuel + partial.payroll + partial.ads + partial.insurance;
  return { ...partial, other: partial.costs - known };
}

/** One working month for a single truck, split back into the costs you typed. */
function monthSlice(truck: TruckResult, form: CalculatorInput, jobsPerDay: number): { weeks: number; slice: Slice } | null {
  const month = truck.months.find((m) => m.active);
  if (!month || month.jobs == null) return null;
  const hired = truck.operator === "hired";
  const weeks = month.weeks;
  const jobs = month.jobs;
  const days = jobsPerDay > 0 ? jobs / jobsPerDay : 0;
  const chem = form.suppliesPerJob != null ? mul(form.suppliesPerJob, jobs) : 0;
  const fuel = form.fuelPerDay != null ? mul(form.fuelPerDay * form.daysPerWeek, weeks) : 0;
  const dayRate = hired ? form.payrollPerDay : form.ownerPayPerDay;
  const payroll = dayRate != null ? mul(dayRate * form.daysPerWeek, weeks) : 0;
  const ads = form.adsPerWeek != null ? mul(form.adsPerWeek, weeks) : 0;
  const insurance = form.insurancePerMonth ?? 0;
  return {
    weeks,
    slice: sliceOf({
      jobs, days, revenue: month.revenue, chem, fuel, payroll, ads, insurance,
      costs: month.directOperating, profit: month.contribution,
    }),
  };
}

function scale(slice: Slice, divisor: number): Slice {
  const each = (n: number) => (divisor > 0 ? Math.round(n / divisor) : 0);
  const scaled = {
    jobs: divisor > 0 ? slice.jobs / divisor : 0,
    days: divisor > 0 ? slice.days / divisor : 0,
    revenue: each(slice.revenue),
    chem: each(slice.chem),
    fuel: each(slice.fuel),
    payroll: each(slice.payroll),
    ads: each(slice.ads),
    insurance: each(slice.insurance),
    other: each(slice.other),
    profit: each(slice.profit),
  };
  return scaled;
}

function seasonSlice(truck: TruckResult, form: CalculatorInput, jobsPerDay: number): Slice {
  const jobs = jobsOf(truck);
  const hired = truck.operator === "hired";
  const payroll = lineOf(truck, hired ? "crew_payroll" : "owner_compensation");
  return sliceOf({
    jobs,
    days: jobsPerDay > 0 ? jobs / jobsPerDay : 0,
    revenue: truck.revenue,
    chem: lineOf(truck, "bleach"),
    fuel: lineOf(truck, "truck_fuel"),
    payroll,
    ads: lineOf(truck, "advertising"),
    insurance: lineOf(truck, "truck_insurance"),
    costs: truck.directOperating,
    profit: truck.contribution,
  });
}

const COLS: { key: keyof Slice; label: string; cost?: boolean }[] = [
  { key: "jobs", label: "Jobs" },
  { key: "revenue", label: "You charge" },
  { key: "chem", label: "Chemicals", cost: true },
  { key: "fuel", label: "Fuel", cost: true },
  { key: "payroll", label: "Payroll", cost: true },
  { key: "ads", label: "Advertising", cost: true },
  { key: "insurance", label: "Insurance", cost: true },
  { key: "other", label: "Other costs", cost: true },
  { key: "profit", label: "Profit" },
];

function cell(key: keyof Slice, slice: Slice): string {
  if (key === "jobs") return fmtCount(slice.jobs);
  const n = slice[key];
  if (key !== "revenue" && key !== "profit" && n === 0) return "—";
  if (key === "profit") return fmtMoneyExact(n);
  return key === "revenue" ? fmtMoneyExact(n) : `−${fmtMoneyExact(n)}`;
}

function TruckBreakdown({
  truck, form, count, jobsPerDay, onJobsPerDay, heading,
}: {
  truck: TruckResult;
  form: CalculatorInput;
  count: number;
  jobsPerDay: number;
  onJobsPerDay?: (n: number) => void;
  heading?: string;
}) {
  const month = monthSlice(truck, form, jobsPerDay);
  if (!month) return null;
  const season = seasonSlice(truck, form, jobsPerDay);
  const perJob = scale(month.slice, month.slice.jobs);
  const perDay = scale(month.slice, month.slice.days);
  const columns = [
    { title: "One job", slice: perJob },
    { title: "One day", slice: perDay },
    { title: "Per month", slice: month.slice },
    { title: `${form.months} mo`, slice: season },
  ];
  const hired = truck.operator === "hired";
  const visible = COLS.filter((col) => col.key === "jobs" || col.key === "revenue" || col.key === "profit" || columns.some((c) => Math.abs(c.slice[col.key]) >= (col.key === "other" ? 100 : 1)));
  const each = heading ?? (hired ? "Hired truck" : "Truck you drive");
  const title = count > 1 ? `Each ${each.toLowerCase()} · ${count}` : each;
  return (
    <div className="flex h-full min-h-[220px] min-w-0 flex-col rounded-xl border border-brand-border bg-gray-50 px-3 py-2.5 md:min-h-0 duo:min-h-0 duo:px-2 duo:py-1.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onJobsPerDay && (
          <label className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
            Jobs / day
            <NumberInput className="w-16" value={jobsPerDay} min={0} max={20} onChange={(n) => n != null && onJobsPerDay(n)} />
          </label>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full h-full text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-brand-border text-xs uppercase tracking-[0.12em] text-gray-500">
              <th className="text-left py-1.5 pr-2 font-medium" />
              {columns.map((c) => <th key={c.title} className="text-right py-1.5 px-1.5 font-medium whitespace-nowrap">{c.title}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((col) => (
              <tr key={col.key} className={cx("border-b border-gray-100", col.key === "profit" && "font-semibold")}>
                <td className={cx("py-1 pr-2 text-left whitespace-nowrap", col.key === "profit" ? "text-brand-black" : "text-gray-600")}>{col.key === "payroll" && !hired ? "Your pay" : col.key === "ads" ? "Ads, this truck" : col.label}</td>
                {columns.map((c) => (
                  <td key={c.title} className={cx("text-right py-1 px-1.5 whitespace-nowrap", col.key === "profit" && (c.slice.profit >= 0 ? "text-green-600" : "text-brand-red"), col.cost && "text-brand-red")}>{cell(col.key, c.slice)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function monthRows(preview: Results): { label: string; profit?: boolean; cells: { text: string; raw: number }[]; year: string; yearRaw: number }[] {
  const money = (n: number) => (n ? fmtMoney(n) : "—");
  const rows: { label: string; profit?: boolean; pick: (m: Results["months"][number]) => number; year: number; yearText?: string; count?: boolean }[] = [
    { label: "Jobs", pick: (m) => m.jobs ?? 0, year: preview.meta.totalJobs ?? 0, count: true },
    { label: "Revenue", pick: (m) => m.revenue, year: preview.totals.revenue },
    { label: "Chemicals", pick: (m) => m.byCategory.chemicals, year: preview.totals.chemicals },
    { label: "Payroll", pick: (m) => m.byCategory.payroll + m.byCategory.payroll_burden, year: preview.totals.payroll + preview.totals.payrollBurden },
    { label: "Ads, all trucks", pick: (m) => m.byCategory.marketing, year: preview.totals.advertising },
    { label: "Fuel & ins.", pick: (m) => m.byCategory.vehicle, year: preview.totals.byCategory.vehicle },
    { label: "Other", pick: (m) => m.operatingExpenses - m.byCategory.chemicals - m.byCategory.payroll - m.byCategory.payroll_burden - m.byCategory.marketing - m.byCategory.vehicle, year: preview.totals.operatingExpenses - preview.totals.chemicals - preview.totals.payroll - preview.totals.payrollBurden - preview.totals.advertising - preview.totals.byCategory.vehicle },
    { label: "Profit", profit: true, pick: (m) => m.operatingProfit, year: preview.totals.operatingProfit, yearText: fmtMoneyExact(preview.totals.operatingProfit) },
  ];
  return rows.map((row) => ({
    label: row.label,
    profit: row.profit,
    cells: preview.months.map((m) => {
      const raw = row.pick(m);
      const text = row.count ? (raw > 0 ? fmtCount(raw) : "—") : row.profit ? fmtMoney(raw) : money(raw);
      return { text, raw };
    }),
    year: row.yearText ?? (row.count ? (row.year > 0 ? fmtCount(row.year) : "—") : money(row.year)),
    yearRaw: row.year,
  }));
}

export default function JobCalculator() {
  const { working, setWorking } = useSavedScenario();
  const form = useMemo(() => readCalculator(working), [working]);

  const commit = (next: CalculatorInput) => {
    setWorking(applyCalculator(working, next));
  };
  const patch = (partial: Partial<CalculatorInput>) => {
    if (!form) return;
    commit({ ...form, ...partial });
  };

  const preview = useMemo(() => computeResults(applyCalculator(working, form)), [working, form]);

  const hired = preview.trucks.find((t) => t.operator === "hired");
  const owner = preview.trucks.find((t) => t.operator === "owner");
  const hasTicket = form.ticket != null && form.ticket > 0;
  const profit = preview.totals.operatingProfit;
  const offSeasonBills = preview.months.filter((m) => !m.active).reduce((sum, m) => sum + m.operatingExpenses, 0);
  const jobs = preview.meta.totalJobs ?? 0;
  const workDays = form.daysPerWeek * preview.meta.operatingWeeks;
  const perJobProfit = jobs > 0 ? Math.round(profit / jobs) : 0;
  const perDayProfit = workDays > 0 ? Math.round(profit / workDays) : 0;
  const perMonthProfit = offSeasonBills > 0 ? Math.round(profit / 12) : preview.kpis.avgMonthlyProfitInSeason;
  const named = ["bleach", "truck_fuel", "crew_payroll", "owner_compensation", "advertising", "truck_insurance", "rent"];
  const otherCosts = preview.totals.operatingExpenses - named.reduce((sum, key) => sum + companyLine(preview, key), 0);

  const owners = preview.trucks.filter((t) => t.operator === "owner");
  const splitOwners = owners.length >= 2;
  const hiredRates = hired ? profitRates(hired, form, form.jobsPerDay) : null;
  const ownerRateList = owners
    .map((truck, i) => profitRates(truck, form, splitOwners ? (form.ownerJobsPerDay[i] ?? form.jobsPerDay) : form.jobsPerDay))
    .filter((rates): rates is ProfitRates => rates != null);
  const ownerRates = ownerRateList.length
    ? {
        perJob: meanRate(ownerRateList.map((rates) => rates.perJob)),
        perDay: meanRate(ownerRateList.map((rates) => rates.perDay)),
        perMonth: meanRate(ownerRateList.map((rates) => rates.perMonth)),
      }
    : null;
  const ownerRatesDiffer = ownerRateList.length > 1 && ownerRateList.some((rates) => rates.perMonth !== ownerRateList[0].perMonth);
  const duoColumns = [
    hiredRates ? { label: form.hiredTrucks > 1 ? `Each hired · ${form.hiredTrucks}` : "Hired truck", rates: hiredRates } : null,
    ownerRates ? { label: ownerRatesDiffer ? "You, average" : owners.length > 1 ? `Each you drive · ${owners.length}` : "You drive", rates: ownerRates } : null,
    { label: form.trucks > 1 ? `All ${form.trucks} trucks` : "All trucks", rates: { perJob: perJobProfit, perDay: perDayProfit, perMonth: perMonthProfit } },
  ].filter((column): column is { label: string; rates: ProfitRates } => column != null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 duo:gap-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 duo:grid-cols-7 gap-x-2 gap-y-1.5 shrink-0">
        <Field label="Price per job"><MoneyInput value={form.ticket} onChange={(n) => patch({ ticket: n })} placeholder="0" /></Field>
        <Field label={splitOwners && form.hiredTrucks > 0 ? "Crew jobs / truck / day" : "Jobs / truck / day"}><NumberInput value={form.jobsPerDay} min={0} max={20} onChange={(n) => n != null && patch({ jobsPerDay: n })} /></Field>
        <Field label="Days / week"><NumberInput value={form.daysPerWeek} min={1} max={7} onChange={(n) => n != null && patch({ daysPerWeek: n })} /></Field>
        <Field label="Months"><NumberInput value={form.months} min={1} max={12} onChange={(n) => n != null && patch({ months: n })} /></Field>
        <Field label="Trucks"><NumberInput value={form.trucks} min={1} max={25} onChange={(n) => n != null && patch({ trucks: n, hiredTrucks: Math.min(form.hiredTrucks, n) })} /></Field>
        <Field label="Hired crews"><NumberInput value={form.hiredTrucks} min={0} max={form.trucks} onChange={(n) => n != null && patch({ hiredTrucks: n })} /></Field>
        <Field label="You drive"><NumberInput value={Math.max(0, form.trucks - form.hiredTrucks)} min={0} max={form.trucks} onChange={(n) => n != null && patch({ hiredTrucks: Math.max(0, form.trucks - n) })} /></Field>
        <Field label="Chemicals / job"><MoneyInput value={form.suppliesPerJob} onChange={(n) => patch({ suppliesPerJob: n })} placeholder="0" /></Field>
        <Field label="Fuel / truck / day"><MoneyInput value={form.fuelPerDay} onChange={(n) => patch({ fuelPerDay: n })} placeholder="0" /></Field>
        <Field label="Payroll / hired truck / day"><MoneyInput value={form.payrollPerDay} onChange={(n) => patch({ payrollPerDay: n })} placeholder="0" /></Field>
        <Field label="Ads / truck / week"><MoneyInput value={form.adsPerWeek} onChange={(n) => patch({ adsPerWeek: n })} placeholder="0" /></Field>
        <Field label="Your pay / truck / day"><MoneyInput value={form.ownerPayPerDay} onChange={(n) => patch({ ownerPayPerDay: n })} placeholder="0" /></Field>
        <Field label="Insurance / truck / mo"><MoneyInput value={form.insurancePerMonth} onChange={(n) => patch({ insurancePerMonth: n })} placeholder="0" /></Field>
        <Field label="Rent / mo, company"><MoneyInput value={form.rentPerMonth} onChange={(n) => patch({ rentPerMonth: n })} placeholder="0" /></Field>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-brand-border bg-gray-50 px-3 py-2">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-gray-500">{hasTicket ? (offSeasonBills > 0 ? "Profit this year" : `Profit, ${form.months} mo`) : "Profit"}</div>
          <div className={cx("tabular-nums text-3xl font-semibold leading-none duo:text-2xl", !hasTicket ? "text-gray-500" : profit >= 0 ? "text-green-600" : "text-brand-red")}>{hasTicket ? fmtMoneyExact(profit) : "—"}</div>
        </div>
        {hasTicket && <DuoSummary columns={duoColumns} />}
        <div className="text-sm text-gray-500 tabular-nums ml-auto">
          {fmtMoney(preview.totals.revenue)} in · {fmtMoney(preview.totals.operatingExpenses)} out
          {form.payrollPerDay != null && form.payrollPerDay > 0 && form.hiredTrucks === 0 ? " · payroll not charged (no hired truck)" : ""}
        </div>
      </div>

      <div className={cx("flex-1 min-h-0 grid gap-2 duo:gap-1.5", (hired ? 1 : 0) + (owners.length ? 1 : 0) + 1 >= 3 ? "xl:grid-cols-3 duo:grid-cols-3" : "xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)] duo:grid-cols-[minmax(0,1.4fr)_minmax(200px,0.75fr)]")}>
        {hired && <TruckBreakdown truck={hired} form={form} count={form.hiredTrucks} jobsPerDay={form.jobsPerDay} />}
        {splitOwners && (
          <div className="min-h-0 h-full grid gap-2" style={{ gridTemplateRows: `repeat(${owners.length}, minmax(0, 1fr))` }}>
            {owners.map((truck, i) => (
              <TruckBreakdown
                key={truck.truckId}
                truck={truck}
                form={form}
                count={1}
                heading={`You · ${truck.name}`}
                jobsPerDay={form.ownerJobsPerDay[i] ?? form.jobsPerDay}
                onJobsPerDay={(n) => {
                  const next = owners.map((_, j) => form.ownerJobsPerDay[j] ?? form.jobsPerDay);
                  next[i] = n;
                  patch({ ownerJobsPerDay: next });
                }}
              />
            ))}
          </div>
        )}
        {!splitOwners && owner && <TruckBreakdown truck={owner} form={form} count={owners.length} jobsPerDay={form.jobsPerDay} />}
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-brand-border bg-gray-50 px-3 py-2.5">
          <h3 className="text-sm font-semibold mb-1">All {form.trucks} truck{form.trucks === 1 ? "" : "s"}</h3>
          <YearStack form={form} results={preview} otherCosts={otherCosts} />
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto rounded-xl border border-brand-border bg-white px-3 py-2 duo:max-h-[38%] duo:min-h-0 duo:py-1">
        <table className="w-full text-[13px] tabular-nums">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-500">
              <th className="text-left font-medium pr-2" />
              {preview.months.map((m) => (
                <th key={m.monthIndex} className={cx("text-right font-medium px-1", !m.active && "opacity-40")}>{m.label}</th>
              ))}
              <th className="text-right font-medium pl-2">Year</th>
            </tr>
          </thead>
          <tbody>
            {monthRows(preview).map((row) => (
              <tr key={row.label}>
                <td className={cx("text-left pr-2 py-0.5 whitespace-nowrap", row.profit ? "font-semibold text-brand-black" : "text-gray-600")}>{row.label}</td>
                {row.cells.map((cell, i) => (
                  <td key={preview.months[i].monthIndex} className={cx("text-right px-1 py-0.5 whitespace-nowrap", !preview.months[i].active && "opacity-40", row.profit && (cell.raw >= 0 ? "text-green-600" : "text-brand-red"))}>{cell.text}</td>
                ))}
                <td className={cx("text-right pl-2 py-0.5 whitespace-nowrap font-medium", row.profit && (row.yearRaw >= 0 ? "text-green-600" : "text-brand-red"))}>{row.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] uppercase leading-tight tracking-[0.04em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

interface ProfitRates {
  perJob: number;
  perDay: number;
  perMonth: number;
}

function profitRates(truck: TruckResult, form: CalculatorInput, jobsPerDay: number): ProfitRates | null {
  const month = monthSlice(truck, form, jobsPerDay);
  if (!month) return null;
  const perJob = scale(month.slice, month.slice.jobs);
  const perDay = scale(month.slice, month.slice.days);
  return { perJob: perJob.profit, perDay: perDay.profit, perMonth: month.slice.profit };
}

function meanRate(values: number[]): number {
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

/** Hired truck and the truck you drive, next to the whole company. */
function DuoSummary({ columns }: { columns: { label: string; rates: ProfitRates }[] }) {
  const rows: { key: keyof ProfitRates; label: string }[] = [
    { key: "perJob", label: "Per job" },
    { key: "perDay", label: "Per day" },
    { key: "perMonth", label: "Per month" },
  ];
  return (
    <table className="text-sm tabular-nums">
      <thead>
        <tr>
          <th />
          {columns.map((column) => (
            <th key={column.label} className="px-2 text-right text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="pr-2 text-[10px] uppercase tracking-[0.12em] text-gray-500">{row.label}</td>
            {columns.map((column) => {
              const value = column.rates[row.key];
              return (
                <td key={column.label} className={cx("px-2 text-right font-semibold", value >= 0 ? "text-green-600" : "text-brand-red")}>{fmtMoneyExact(value)}</td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
