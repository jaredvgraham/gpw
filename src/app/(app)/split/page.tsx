"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAppData } from "@/contexts/AppDataContext";
import { EXPENSE_PAYERS, EXPENSE_TYPES, type ExpensePayer, type ExpenseType } from "@/lib/expenses";
import {
  computeOnTarget,
  computeSplit,
  getPresetRange,
  settlementFigures,
  SPLIT_PRESETS,
  type SettlementFigures,
  type SplitPreset,
  type SplitSummary,
} from "@/lib/split";
import { formatCurrency, formatDate, getCustomerName } from "@/lib/utils";
import type { Expense } from "@/types";

const initialRange = getPresetRange("7d");

export default function SplitPage() {
  const { jobs, jobsLoading } = useAppData();
  const [preset, setPreset] = useState<SplitPreset>("7d");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [type, setType] = useState<ExpenseType>("Gas");
  const [paidBy, setPaidBy] = useState<ExpensePayer>("Justin");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(initialRange.to);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rangeInvalid = from > to;

  const fetchExpenses = useCallback(async () => {
    if (rangeInvalid) {
      setExpenses([]);
      setExpensesLoading(false);
      return;
    }

    setExpensesLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load expenses");
      setExpenses(await res.json());
    } catch (error) {
      console.error(error);
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  }, [from, to, rangeInvalid]);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  const summary = useMemo(
    () => (rangeInvalid ? null : computeSplit(jobs, expenses, { from, to })),
    [jobs, expenses, from, to, rangeInvalid],
  );

  const onTarget = useMemo(
    () => (rangeInvalid ? null : computeOnTarget(jobs, expenses, { from, to })),
    [jobs, expenses, from, to, rangeInvalid],
  );

  function selectPreset(next: SplitPreset) {
    setPreset(next);
    if (next === "custom") return;
    const range = getPresetRange(next);
    setFrom(range.from);
    setTo(range.to);
    setExpenseDate(range.to);
  }

  async function addExpense() {
    setFormError("");
    const parsedAmount = Number(amount);
    if (!expenseDate) {
      setFormError("Pick a date.");
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setFormError("Enter an amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          paidBy,
          date: expenseDate,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Could not save expense.");
        return;
      }
      setAmount("");
      setNote("");
      await fetchExpenses();
    } catch (error) {
      console.error(error);
      setFormError("Could not save expense.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setExpenses((current) => current.filter((expense) => expense._id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const loading = (jobsLoading && jobs.length === 0) || expensesLoading;
  const settlement = summary ? settlementFigures(summary) : null;
  const justinPays = !settlement || settlement.jaredPayout >= 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl overflow-x-hidden overscroll-x-none xl:max-w-none">
      <PageHeader
        title="Split"
        description="Completed job totals minus expenses, split in half."
      />

      <div className="mb-5 xl:flex xl:items-end xl:justify-between xl:gap-6">
      <div className="mb-4 flex flex-wrap gap-2 xl:mb-0">
        {SPLIT_PRESETS.map((option) => {
          const active = preset === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectPreset(option.id)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
                active
                  ? "bg-brand-blue text-white"
                  : "border border-brand-border bg-white text-gray-700"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 xl:w-80 xl:shrink-0">
        <div className="min-w-0">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => {
              setPreset("custom");
              setFrom(e.target.value);
            }}
            className="min-w-0 max-w-full"
          />
        </div>
        <div className="min-w-0">
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => {
              setPreset("custom");
              setTo(e.target.value);
            }}
            className="min-w-0 max-w-full"
          />
        </div>
      </div>
      </div>

      {rangeInvalid ? (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          The start date needs to be on or before the end date.
        </p>
      ) : loading || !summary || !settlement ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-brand-border bg-white">
            <div className="px-4 pb-4 pt-4 xl:flex xl:items-center xl:justify-between xl:px-6 xl:py-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 xl:flex xl:gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Pays
                  </p>
                  <p className="mt-0.5 truncate text-xl font-bold text-brand-black">
                    {justinPays ? "Justin" : "Jared"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Gets
                  </p>
                  <p className="mt-0.5 truncate text-xl font-bold text-brand-black">
                    {justinPays ? "Jared" : "Justin"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums text-brand-blue xl:mt-0 xl:text-5xl">
                {formatCurrency(Math.abs(settlement.jaredPayout))}
              </p>
            </div>

            {onTarget && (
              <OnTarget
                summary={onTarget}
                remainingCount={onTarget.jobs.filter((job) => job.status !== "Completed").length}
              />
            )}

            <SettlementMath figures={settlement} />
          </section>

          <div className="space-y-4 xl:grid xl:grid-cols-3 xl:items-start xl:gap-4 xl:space-y-0">
          {summary.expenses.some((expense) => !expense.paidBy) && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 xl:col-span-3">
              Some older expenses don&apos;t say who paid. Delete and re-add them so the payout is right.
            </p>
          )}

          <section className="rounded-xl border border-brand-border bg-white">
            <div className="border-b border-brand-border px-4 py-3">
              <h2 className="text-base font-semibold text-brand-black">Add expense</h2>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Type</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ExpenseType)}
                    className="w-full rounded-lg border border-brand-border bg-white px-3 py-2.5 text-base text-gray-900"
                  >
                    {EXPENSE_TYPES.map((expenseType) => (
                      <option key={expenseType} value={expenseType}>
                        {expenseType}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Paid by</span>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPENSE_PAYERS.map((payer) => (
                      <button
                        key={payer}
                        type="button"
                        onClick={() => setPaidBy(payer)}
                        className={`min-h-12 rounded-lg border text-sm font-semibold ${
                          paidBy === payer
                            ? "border-brand-blue bg-blue-50 text-brand-blue"
                            : "border-brand-border bg-white text-gray-700"
                        }`}
                      >
                        {payer}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Input
                  label="Date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <Input
                label="Note"
                placeholder="Optional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {formError && <p className="text-sm text-brand-red">{formError}</p>}
              <Button
                type="button"
                onClick={() => void addExpense()}
                disabled={saving}
                className="w-full min-h-12"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {saving ? "Saving…" : "Add expense"}
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-brand-border bg-white">
            <div className="border-b border-brand-border px-4 py-3">
              <h2 className="text-base font-semibold text-brand-black">
                Expenses in this range
              </h2>
            </div>
            {summary.expenses.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                No expenses in this range.
              </p>
            ) : (
              <ul className="divide-y divide-brand-border">
                {summary.expenses.map((expense) => (
                  <li key={expense._id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-brand-black">{expense.type}</p>
                        <span className="rounded-full bg-brand-gray px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          {expense.paidBy ?? "Unassigned"}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(expense.date)}</span>
                      </div>
                      {expense.note && (
                        <p className="mt-0.5 text-sm text-gray-600">{expense.note}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        Each owner {formatCurrency(expense.amount / 2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold tabular-nums text-brand-black">
                        {formatCurrency(expense.amount)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void deleteExpense(expense._id)}
                        disabled={deletingId === expense._id}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 active:bg-red-50 active:text-brand-red"
                        aria-label={`Delete ${expense.type} expense`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-brand-border bg-white">
            <div className="border-b border-brand-border px-4 py-3">
              <h2 className="text-base font-semibold text-brand-black">Completed jobs</h2>
            </div>
            {summary.jobs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                No completed jobs in this range.
              </p>
            ) : (
              <ul className="divide-y divide-brand-border">
                {summary.jobs.map((job) => (
                  <li key={job._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-black">
                        {getCustomerName(job)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(job.jobDate)}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-brand-black">
                      {formatCurrency(job.finalPrice)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
        </div>
      )}
    </div>
  );
}

function OnTarget({
  summary,
  remainingCount,
}: {
  summary: SplitSummary;
  remainingCount: number;
}) {
  const justinPays = summary.justinPaysJared >= 0;

  return (
    <div className="border-t border-blue-100 bg-blue-50/80 px-4 py-4 xl:flex xl:items-center xl:justify-between xl:gap-8 xl:px-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
          On target
        </p>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          If every job in this range finishes and no more expenses are added.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          {remainingCount === 0
            ? "Every job in this range is already finished."
            : `${remainingCount} ${remainingCount === 1 ? "job" : "jobs"} still to finish.`}{" "}
          On-target job total {formatCurrency(summary.gross)}. Each half{" "}
          {formatCurrency(summary.ownerNet)}.
        </p>
      </div>
      <div className="mt-3 shrink-0 xl:mt-0 xl:text-right">
        <p className="text-sm font-medium text-gray-600">
          {justinPays ? "Justin pays Jared" : "Jared pays Justin"}
        </p>
        <p className="text-3xl font-bold tabular-nums text-brand-black">
          {formatCurrency(Math.abs(summary.justinPaysJared))}
        </p>
      </div>
    </div>
  );
}

function SettlementMath({ figures }: { figures: SettlementFigures }) {
  const {
    gross,
    expenses,
    net,
    each,
    jaredPaid,
    justinPaid,
    jaredPayout,
    justinKeeps,
    jaredFinal,
    balanced,
  } = figures;

  return (
    <div className="space-y-5 border-t border-brand-border px-4 py-4 xl:px-6 xl:py-5">
      <div className="max-w-xl space-y-1.5 text-base font-medium leading-snug tabular-nums text-brand-black">
        <p>
          {formatCurrency(gross)} − {formatCurrency(expenses)} = {formatCurrency(net)}
        </p>
        <p>
          {formatCurrency(net)} ÷ 2 = {formatCurrency(each)} each
        </p>
      </div>

      <div className="space-y-0.5 text-sm text-gray-600">
        <p>Jared paid {formatCurrency(jaredPaid)}</p>
        <p>Justin paid {formatCurrency(justinPaid)}</p>
      </div>

      <div className="max-w-xl space-y-4">
        <EquationLine
          label="Jared"
          left={`${formatCurrency(each)} + ${formatCurrency(jaredPaid)}`}
          result={formatCurrency(jaredPayout)}
        />
        <EquationLine
          label="Justin"
          left={`${formatCurrency(gross)} − ${formatCurrency(justinPaid)} − ${formatCurrency(jaredPayout)}`}
          result={formatCurrency(justinKeeps)}
        />
      </div>

      <div className="max-w-xl border-t border-brand-border pt-4">
        <p className="text-sm font-bold text-brand-black">Final</p>
        <ul className="mt-2 space-y-1.5 text-sm leading-snug tabular-nums text-gray-800">
          <li>
            <span className="font-bold text-brand-black">Jared:</span> {formatCurrency(jaredPayout)} −{" "}
            {formatCurrency(jaredPaid)} = {formatCurrency(jaredFinal)}
          </li>
          <li>
            <span className="font-bold text-brand-black">Justin:</span> {formatCurrency(justinKeeps)}
          </li>
        </ul>
        {balanced && (
          <p className="mt-3 text-sm text-gray-500">Exactly 50/50 after all expenses.</p>
        )}
      </div>
    </div>
  );
}

function EquationLine({ label, left, result }: { label: string; left: string; result: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-brand-black">{label}</p>
      <p className="mt-0.5 text-sm leading-snug tabular-nums text-gray-800">
        {left} = <span className="font-semibold text-brand-black">{result}</span>
      </p>
    </div>
  );
}
