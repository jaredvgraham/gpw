"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAppData } from "@/contexts/AppDataContext";
import { EXPENSE_TYPES, type ExpenseType } from "@/lib/expenses";
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
        description="Completed jobs minus expenses, split between the two owners."
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
              Each owner&apos;s net
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-brand-black">
              {formatCurrency(summary.ownerNet)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Half of {formatCurrency(summary.net)} net
            </p>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Gross"
              value={formatCurrency(summary.gross)}
              detail={`${summary.jobCount} completed job${summary.jobCount !== 1 ? "s" : ""}`}
            />
            <SummaryCard
              label="Expenses"
              value={formatCurrency(summary.expensesTotal)}
              detail={`Each owner ${formatCurrency(summary.ownerExpenses)}`}
            />
            <SummaryCard
              label="Net"
              value={formatCurrency(summary.net)}
              detail="Gross minus expenses"
            />
          </div>

          <section className="rounded-xl border border-brand-border bg-white">
            <div className="border-b border-brand-border px-4 py-3">
              <h2 className="text-base font-semibold text-brand-black">Add expense</h2>
            </div>
            <div className="space-y-3 p-4">
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
