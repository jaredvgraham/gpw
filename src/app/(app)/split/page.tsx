"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAppData } from "@/contexts/AppDataContext";
import { EXPENSE_PAYERS, EXPENSE_TYPES, type ExpensePayer, type ExpenseType } from "@/lib/expenses";
import {
  computeSplit,
  getPresetRange,
  SPLIT_PRESETS,
  type SplitPreset,
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

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Split"
        description="Justin collects the checks. Profit and expenses are split in half, then Jared is paid back for what he covered."
      />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {SPLIT_PRESETS.map((option) => {
          const active = preset === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectPreset(option.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${
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

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Input
          label="From"
          type="date"
          value={from}
          onChange={(e) => {
            setPreset("custom");
            setFrom(e.target.value);
          }}
        />
        <Input
          label="To"
          type="date"
          value={to}
          onChange={(e) => {
            setPreset("custom");
            setTo(e.target.value);
          }}
        />
      </div>

      {rangeInvalid ? (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          The start date needs to be on or before the end date.
        </p>
      ) : loading || !summary ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-brand-blue bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
              {summary.justinPaysJared >= 0 ? "Justin pays Jared" : "Jared pays Justin"}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-brand-black">
              {formatCurrency(Math.abs(summary.justinPaysJared))}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {summary.justinPaysJared >= 0 ? (
                <>
                  Each owner&apos;s half of the net is {formatCurrency(summary.ownerNet)}. Justin
                  already holds the customer checks
                  {summary.paidByJared > 0
                    ? `, so he also pays Jared back the ${formatCurrency(summary.paidByJared)} Jared spent out of pocket.`
                    : "."}
                </>
              ) : (
                <>
                  Each owner&apos;s half of the net is {formatCurrency(summary.ownerNet)}. Jared
                  pays Justin so both end on that number after the expenses Justin covered.
                </>
              )}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryCard
              label="Jared keeps"
              value={formatCurrency(summary.ownerNet)}
              detail={`Paid ${formatCurrency(summary.paidByJared)} in expenses`}
            />
            <SummaryCard
              label="Justin keeps"
              value={formatCurrency(summary.ownerNet)}
              detail={`Collected ${formatCurrency(summary.gross)} and paid ${formatCurrency(summary.paidByJustin)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Gross"
              value={formatCurrency(summary.gross)}
              detail={`${summary.jobCount} completed job${summary.jobCount !== 1 ? "s" : ""} collected by Justin`}
            />
            <SummaryCard
              label="Expenses"
              value={formatCurrency(summary.expensesTotal)}
              detail={`Each owner ${formatCurrency(summary.ownerExpenses)}`}
            />
            <SummaryCard
              label="Net"
              value={formatCurrency(summary.net)}
              detail={`Each owner ${formatCurrency(summary.ownerNet)}`}
            />
          </div>

          {summary.expenses.some((expense) => !expense.paidBy) && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-brand-border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-brand-black">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}
