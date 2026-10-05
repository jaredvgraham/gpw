import { formatCurrency } from "@/lib/utils";

export default function GrossNetSection({
  gross,
  expenses,
  net,
  expensesReady,
}: {
  gross: number;
  expenses: number;
  net: number;
  expensesReady: boolean;
}) {
  const expenseAmount = expensesReady ? formatCurrency(expenses) : "—";
  const netAmount = expensesReady ? formatCurrency(net) : "—";

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-brand-border">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Gross</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-black sm:text-3xl">
            {formatCurrency(gross)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Excludes cancelled</p>
        </div>
        <div className="border-t border-brand-border px-5 py-4 sm:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Expenses</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-black sm:text-3xl">
            {expensesReady ? `−${expenseAmount}` : "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">In this period</p>
        </div>
        <div className="border-t border-brand-border px-5 py-4 sm:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Net</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${
              expensesReady && net < 0 ? "text-brand-red" : "text-brand-black"
            }`}
          >
            {netAmount}
          </p>
          <p className="mt-1 text-xs text-gray-500">Gross minus expenses</p>
        </div>
      </div>
    </section>
  );
}
