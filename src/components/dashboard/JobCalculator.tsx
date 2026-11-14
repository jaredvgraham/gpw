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
  const clamp = (n: number) => {
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return n;
  };
  const commitLive = (raw: string) => {
    const cleaned = raw.replace(/[,%\s]/g, "");
    if (cleaned === "") return;
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n)) return;
    onChange(clamp(n));
  };
  const notch = (dir: -1 | 1) => {
    const base = Number.isFinite(value) ? value : min ?? 0;
    const n = clamp(Math.round(base) + dir);
    onChange(n);
    setText(String(n));
  };
  const atMin = min != null && value <= min;
  const atMax = max != null && value >= max;
  return (
    <div className="number-notch flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Decrease"
        disabled={atMin}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => notch(-1)}
        className="flex h-9 w-6 shrink-0 items-center justify-center rounded-md border border-brand-border bg-white text-sm leading-none text-gray-600 hover:bg-gray-50 disabled:opacity-30"
      >
        −
      </button>
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
          const n = clamp(parseFloat(cleaned));
          onChange(n);
          setText(String(n));
        }}
        className={cx(
          "w-8 shrink-0 rounded-lg border border-brand-border bg-white text-center text-brand-black tabular-nums outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20",
          "h-9 px-0.5 text-sm",
          className,
        )}
      />
      <button
        type="button"
        aria-label="Increase"
        disabled={atMax}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => notch(1)}
        className="flex h-9 w-6 shrink-0 items-center justify-center rounded-md border border-brand-border bg-white text-sm leading-none text-gray-600 hover:bg-gray-50 disabled:opacity-30"
      >
        +
      </button>
    </div>
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
  ownerPay: number;
  ads: number;
  insurance: number;
  rent: number;
  other: number;
  profit: number;
}

function sliceOf(partial: Omit<Slice, "other" | "profit"> & { costs: number; profit: number }): Slice {
  const known = partial.chem + partial.fuel + partial.payroll + partial.ownerPay + partial.ads + partial.insurance + partial.rent;
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
  const payroll = hired && form.payrollPerDay != null ? mul(form.payrollPerDay * form.daysPerWeek, weeks) : 0;
  const ownerPay = !hired && form.ownerPayPerDay != null ? mul(form.ownerPayPerDay * form.daysPerWeek, weeks) : 0;
  const ads = form.adsPerWeek != null ? mul(form.adsPerWeek, weeks) : 0;
  const insurance = form.insurancePerMonth ?? 0;
  return {
    weeks,
    slice: sliceOf({
      jobs, days, revenue: month.revenue, chem, fuel, payroll, ownerPay, ads, insurance, rent: 0,
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
    ownerPay: each(slice.ownerPay),
    ads: each(slice.ads),
    insurance: each(slice.insurance),
    rent: each(slice.rent),
    other: each(slice.other),
    profit: each(slice.profit),
  };
  return scaled;
}

function seasonSlice(truck: TruckResult, form: CalculatorInput, jobsPerDay: number): Slice {
  const jobs = jobsOf(truck);
  const hired = truck.operator === "hired";
  return sliceOf({
    jobs,
    days: jobsPerDay > 0 ? jobs / jobsPerDay : 0,
    revenue: truck.revenue,
    chem: lineOf(truck, "bleach"),
    fuel: lineOf(truck, "truck_fuel"),
    payroll: hired ? lineOf(truck, "crew_payroll") : 0,
    ownerPay: hired ? 0 : lineOf(truck, "owner_compensation"),
    ads: lineOf(truck, "advertising"),
    insurance: lineOf(truck, "truck_insurance"),
    rent: 0,
    costs: truck.directOperating,
    profit: truck.contribution,
  });
}

function companyMonthSlice(month: Results["months"][number], form: CalculatorInput): Slice {
  const jobs = month.jobs ?? 0;
  const days = form.daysPerWeek * month.weeks;
  const trucks = month.activeTrucks || form.trucks;
  const hired = Math.min(form.hiredTrucks, trucks);
  const owners = Math.max(0, trucks - hired);
  const chem = form.suppliesPerJob != null ? mul(form.suppliesPerJob, jobs) : 0;
  const fuel = form.fuelPerDay != null ? mul(form.fuelPerDay * form.daysPerWeek * trucks, month.weeks) : 0;
  const payroll = form.payrollPerDay != null ? mul(form.payrollPerDay * form.daysPerWeek * hired, month.weeks) : 0;
  const ownerPay = form.ownerPayPerDay != null ? mul(form.ownerPayPerDay * form.daysPerWeek * owners, month.weeks) : 0;
  const ads = form.adsPerWeek != null ? mul(form.adsPerWeek * trucks, month.weeks) : 0;
  const insurance = (form.insurancePerMonth ?? 0) * trucks;
  const rent = form.rentPerMonth ?? 0;
  return sliceOf({
    jobs, days, revenue: month.revenue, chem, fuel, payroll, ownerPay, ads, insurance, rent,
    costs: month.operatingExpenses, profit: month.operatingProfit,
  });
}

function companySeasonSlice(preview: Results, form: CalculatorInput): Slice {
  const jobs = preview.meta.totalJobs ?? 0;
  return sliceOf({
    jobs,
    days: form.daysPerWeek * preview.meta.operatingWeeks,
    revenue: preview.totals.revenue,
    chem: companyLine(preview, "bleach"),
    fuel: companyLine(preview, "truck_fuel"),
    payroll: companyLine(preview, "crew_payroll"),
    ownerPay: companyLine(preview, "owner_compensation"),
    ads: companyLine(preview, "advertising"),
    insurance: companyLine(preview, "truck_insurance"),
    rent: companyLine(preview, "rent"),
    costs: preview.totals.operatingExpenses,
    profit: preview.totals.operatingProfit,
  });
}

type RowKey = "jobs" | "revenue" | "expenses" | "chem" | "fuel" | "payroll" | "ownerPay" | "ads" | "insurance" | "rent" | "other" | "profit";

function expensesOf(slice: Slice): number {
  return slice.revenue - slice.profit;
}

function amountOf(key: RowKey, slice: Slice): number {
  if (key === "expenses") return expensesOf(slice);
  return slice[key];
}

const EXPENSE_KEYS: { key: RowKey; label: string }[] = [
  { key: "chem", label: "Chemicals" },
  { key: "fuel", label: "Fuel" },
  { key: "payroll", label: "Payroll" },
  { key: "ownerPay", label: "Your pay" },
  { key: "ads", label: "Ads" },
  { key: "insurance", label: "Insurance" },
  { key: "rent", label: "Rent" },
  { key: "other", label: "Other" },
];

function cardRows(detail: boolean, columns: { slice: Slice }[]): { key: RowKey; label: string; cost?: boolean }[] {
  const rows: { key: RowKey; label: string; cost?: boolean }[] = [
    { key: "jobs", label: "Jobs" },
    { key: "revenue", label: "You charge" },
  ];
  if (!detail) {
    if (columns.some((c) => Math.abs(expensesOf(c.slice)) >= 1)) rows.push({ key: "expenses", label: "Expenses", cost: true });
  } else {
    for (const part of EXPENSE_KEYS) {
      const meaningful = columns.some((c) => Math.abs(amountOf(part.key, c.slice)) >= (part.key === "other" ? 100 : 1));
      if (meaningful) rows.push({ ...part, cost: true });
    }
  }
  rows.push({ key: "profit", label: "Profit" });
  return rows;
}

function cell(key: RowKey, slice: Slice): string {
  if (key === "jobs") return fmtCount(slice.jobs);
  const n = amountOf(key, slice);
  if (key !== "revenue" && key !== "profit" && n === 0) return "—";
  if (key === "profit") return fmtMoneyExact(n);
  return key === "revenue" ? fmtMoneyExact(n) : `−${fmtMoneyExact(n)}`;
}

function BreakdownTable({ columns, rows }: { columns: { title: string; slice: Slice }[]; rows: { key: RowKey; label: string; cost?: boolean }[] }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="border-b border-brand-border text-xs uppercase tracking-[0.12em] text-gray-500">
            <th className="text-left py-1.5 pr-2 font-medium" />
            {columns.map((c) => <th key={c.title} className="text-right py-1.5 px-1.5 font-medium whitespace-nowrap">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((col) => (
            <tr key={col.key} className={cx("border-b border-gray-100", col.key === "profit" && "font-semibold")}>
              <td className={cx("py-1 pr-2 text-left whitespace-nowrap", col.key === "profit" ? "text-brand-black" : "text-gray-600")}>{col.label}</td>
              {columns.map((c) => (
                <td key={c.title} className={cx("text-right py-1 px-1.5 whitespace-nowrap", col.key === "profit" && (c.slice.profit >= 0 ? "text-green-600" : "text-brand-red"), col.cost && "text-brand-red")}>{cell(col.key, c.slice)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function periodColumns(form: CalculatorInput, month: Slice, season: Slice): { title: string; slice: Slice }[] {
  return [
    { title: "Per day", slice: scale(month, month.days) },
    { title: "Per month", slice: month },
    { title: form.months === 1 ? "1 mo" : `${form.months} mo`, slice: season },
  ];
}

function TruckBreakdown({
  truck, form, count, jobsPerDay, onJobsPerDay, heading, detail,
}: {
  truck: TruckResult;
  form: CalculatorInput;
  count: number;
  jobsPerDay: number;
  onJobsPerDay?: (n: number) => void;
  heading?: string;
  detail: boolean;
}) {
  const month = monthSlice(truck, form, jobsPerDay);
  if (!month) return null;
  const columns = periodColumns(form, month.slice, seasonSlice(truck, form, jobsPerDay));
  const hired = truck.operator === "hired";
  const each = heading ?? (hired ? "Hired truck" : "Truck you drive");
  const title = count > 1 ? `Each ${each.toLowerCase()} · ${count}` : each;
  return (
    <div className="calculator-card flex h-full min-h-[220px] min-w-0 flex-col rounded-xl border border-brand-border bg-gray-50 px-3 py-2.5 md:min-h-0 duo:min-h-0 duo:px-2 duo:py-1.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onJobsPerDay && (
          <label className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
            Jobs / day
            <NumberInput value={jobsPerDay} min={0} max={20} onChange={(n) => n != null && onJobsPerDay(n)} />
          </label>
        )}
      </div>
      <BreakdownTable columns={columns} rows={cardRows(detail, columns)} />
    </div>
  );
}

function CompanyCard({ form, preview, detail }: { form: CalculatorInput; preview: Results; detail: boolean }) {
  const month = preview.months.find((m) => m.active);
  if (!month) return null;
  const columns = periodColumns(form, companyMonthSlice(month, form), companySeasonSlice(preview, form));
  return (
    <div className="calculator-card flex h-full min-h-0 flex-col rounded-xl border border-brand-border bg-gray-50 px-3 py-2.5">
      <h3 className="text-sm font-semibold mb-1">All {form.trucks} truck{form.trucks === 1 ? "" : "s"}</h3>
      <BreakdownTable columns={columns} rows={cardRows(detail, columns)} />
    </div>
  );
}

function monthRows(preview: Results): { label: string; profit?: boolean; cells: { text: string; raw: number }[]; year: string; yearRaw: number }[] {
  const money = (n: number) => (n ? fmtMoney(n) : "—");
  const rows: { label: string; profit?: boolean; pick: (m: Results["months"][number]) => number; year: number; yearText?: string; count?: boolean }[] = [
    { label: "Jobs", pick: (m) => m.jobs ?? 0, year: preview.meta.totalJobs ?? 0, count: true },
    { label: "Revenue", pick: (m) => m.revenue, year: preview.totals.revenue },
    { label: "Expenses", pick: (m) => m.operatingExpenses, year: preview.totals.operatingExpenses },
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
  const [detail, setDetail] = useState(false);

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
  const owners = preview.trucks.filter((t) => t.operator === "owner");
  const hiredTrucks = preview.trucks.filter((t) => t.operator === "hired");
  const ownJobs = owners.length >= 2 || (owners.length === 1 && form.hiredTrucks > 0);
  const hiredOwn = hiredTrucks.length >= 2;
  const hiredJob = (i: number) => form.hiredJobsPerDay[i] ?? form.jobsPerDay;
  const ownerJob = (i: number) => form.ownerJobsPerDay[i] ?? form.jobsPerDay;
  const flatSeason = seasonIsFlat(preview);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 duo:gap-1">
      <div className="calculator-fields grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 duo:grid-cols-7 gap-x-2 gap-y-1.5 shrink-0">
        <Field label="Price per job"><MoneyInput value={form.ticket} onChange={(n) => patch({ ticket: n })} placeholder="0" /></Field>
        <Field label={ownJobs && form.hiredTrucks > 0 ? "Crew jobs / truck / day" : "Jobs / truck / day"}><NumberInput value={form.jobsPerDay} min={0} max={20} onChange={(n) => {
          if (n == null) return;
          const hiredJobs = form.hiredJobsPerDay.map((jobs) => (jobs === form.jobsPerDay ? n : jobs));
          patch({ jobsPerDay: n, ...(hiredOwn ? { hiredJobsPerDay: hiredJobs } : {}) });
        }} /></Field>
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

      <div className="calculator-profit flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-brand-border bg-gray-50 px-3 py-2">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-gray-500">{hasTicket ? (offSeasonBills > 0 ? "Profit this year" : `Profit, ${form.months} mo`) : "Profit"}</div>
          <div className={cx("tabular-nums text-3xl font-semibold leading-none duo:text-2xl", !hasTicket ? "text-gray-500" : profit >= 0 ? "text-green-600" : "text-brand-red")}>{hasTicket ? fmtMoneyExact(profit) : "—"}</div>
        </div>
        {hasTicket && (
          <div className="text-sm tabular-nums text-gray-500">
            All trucks
            <span className={cx("ml-2 font-semibold", perJobProfit >= 0 ? "text-green-600" : "text-brand-red")}>{fmtMoneyExact(perJobProfit)}</span> / job
            <span className={cx("ml-2 font-semibold", perDayProfit >= 0 ? "text-green-600" : "text-brand-red")}>{fmtMoneyExact(perDayProfit)}</span> / day
            <span className={cx("ml-2 font-semibold", perMonthProfit >= 0 ? "text-green-600" : "text-brand-red")}>{fmtMoneyExact(perMonthProfit)}</span> / month
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Cards
            <select
              value={detail ? "expenses" : "summary"}
              onChange={(e) => setDetail(e.target.value === "expenses")}
              className="h-7 rounded-md border border-brand-border bg-white px-1.5 text-xs text-brand-black"
            >
              <option value="summary">Summary</option>
              <option value="expenses">Expenses</option>
            </select>
          </label>
          <div className="text-sm text-gray-500 tabular-nums">
            {fmtMoney(preview.totals.revenue)} in · {fmtMoney(preview.totals.operatingExpenses)} out
            {form.payrollPerDay != null && form.payrollPerDay > 0 && form.hiredTrucks === 0 ? " · payroll not charged (no hired truck)" : ""}
          </div>
        </div>
      </div>

      <div className={cx("calculator-cards flex-1 min-h-0 grid gap-2 duo:gap-1.5", (hired ? 1 : 0) + (owners.length ? 1 : 0) + 1 >= 3 ? "xl:grid-cols-3 duo:grid-cols-3" : "xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)] duo:grid-cols-[minmax(0,1.4fr)_minmax(200px,0.75fr)]")}>
        {hiredOwn && (
          <div className="min-h-0 h-full grid gap-2" style={{ gridTemplateRows: `repeat(${hiredTrucks.length}, minmax(0, 1fr))` }}>
            {hiredTrucks.map((truck, i) => (
              <TruckBreakdown
                key={truck.truckId}
                truck={truck}
                form={form}
                count={1}
                heading={`Crew · ${truck.name}`}
                detail={detail}
                jobsPerDay={hiredJob(i)}
                onJobsPerDay={(n) => {
                  const next = hiredTrucks.map((_, j) => hiredJob(j));
                  next[i] = n;
                  patch({ hiredJobsPerDay: next });
                }}
              />
            ))}
          </div>
        )}
        {!hiredOwn && hired && (
          <TruckBreakdown
            truck={hired}
            form={form}
            count={form.hiredTrucks}
            detail={detail}
            jobsPerDay={form.jobsPerDay}
            onJobsPerDay={(n) => patch({ jobsPerDay: n })}
          />
        )}
        {owners.length >= 2 && (
          <div className="min-h-0 h-full grid gap-2" style={{ gridTemplateRows: `repeat(${owners.length}, minmax(0, 1fr))` }}>
            {owners.map((truck, i) => (
              <TruckBreakdown
                key={truck.truckId}
                truck={truck}
                form={form}
                count={1}
                heading={`You · ${truck.name}`}
                detail={detail}
                jobsPerDay={ownerJob(i)}
                onJobsPerDay={(n) => {
                  const next = owners.map((_, j) => ownerJob(j));
                  next[i] = n;
                  patch({ ownerJobsPerDay: next });
                }}
              />
            ))}
          </div>
        )}
        {owners.length === 1 && owner && form.hiredTrucks > 0 && (
          <TruckBreakdown
            truck={owner}
            form={form}
            count={1}
            detail={detail}
            jobsPerDay={ownerJob(0)}
            onJobsPerDay={(n) => patch({ ownerJobsPerDay: [n] })}
          />
        )}
        {owners.length === 1 && owner && form.hiredTrucks === 0 && <TruckBreakdown truck={owner} form={form} count={1} detail={detail} jobsPerDay={form.jobsPerDay} />}
        <CompanyCard form={form} preview={preview} detail={detail} />
      </div>

      {flatSeason ? (
        <SeasonLine preview={preview} offSeasonBills={offSeasonBills} />
      ) : (
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
      )}
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

/** True when every working month has the same jobs, revenue, and profit. */
function seasonIsFlat(preview: Results): boolean {
  const active = preview.months.filter((m) => m.active);
  if (active.length <= 1) return true;
  const first = active[0];
  return active.every(
    (m) => m.operatingProfit === first.operatingProfit && m.revenue === first.revenue && (m.jobs ?? 0) === (first.jobs ?? 0),
  );
}

function seasonSpan(preview: Results): string {
  const active = preview.months.filter((m) => m.active);
  if (active.length === 0) return "No season";
  const indexes = active.map((m) => m.monthIndex);
  const contiguous = indexes.every((n, i) => i === 0 || n === indexes[i - 1] + 1);
  if (active.length === 1) return active[0].label;
  if (contiguous) return `${active[0].label}–${active[active.length - 1].label}`;
  return active.map((m) => m.label).join(", ");
}

/** One line instead of twelve identical month columns. */
function SeasonLine({ preview, offSeasonBills }: { preview: Results; offSeasonBills: number }) {
  const active = preview.months.filter((m) => m.active);
  const month = active[0];
  if (!month) return null;
  const profit = month.operatingProfit;
  return (
    <div className="calculator-season shrink-0 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm tabular-nums text-gray-600">
      {seasonSpan(preview)}
      <span className="text-gray-400"> · </span>
      {fmtCount(month.jobs ?? 0)} jobs and{" "}
      <span className={cx("font-semibold", profit >= 0 ? "text-green-600" : "text-brand-red")}>{fmtMoney(profit)}</span>
      {" "}profit each month
      {offSeasonBills > 0 && (
        <>
          <span className="text-gray-400"> · </span>
          off-season {fmtMoney(offSeasonBills)}
        </>
      )}
    </div>
  );
}
