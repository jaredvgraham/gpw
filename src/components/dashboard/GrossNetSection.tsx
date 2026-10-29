import { EXPENSE_COLORS, NET_COLOR, type ExpenseType } from "@/lib/expenses";
import { formatCurrency } from "@/lib/utils";

export default function GrossNetSection({
  label,
  gross,
  expenses,
  net,
  expensesReady,
  collected,
  outstanding,
  slices = [],
  stats = [],
}: {
  label: string;
  gross: number;
  expenses: number;
  net: number;
  expensesReady: boolean;
  collected?: number;
  outstanding?: number;
  slices?: { type: ExpenseType; amount: number }[];
  stats?: { value: string; label: string }[];
}) {
  const activeSlices = slices
    .filter((slice) => slice.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const expenseSum = activeSlices.reduce((sum, slice) => sum + slice.amount, 0);
  const showSplit = expensesReady && (gross > 0 || expenseSum > 0);
  const splitScale = net < 0 ? Math.max(expenseSum, 1) : Math.max(gross, 1);
  const showCollection = expensesReady && collected !== undefined && gross > 0;
  const collectedShare = showCollection ? Math.min(100, (collected / gross) * 100) : 0;

  return (
    <section>
      <p className="text-sm font-medium text-gray-500">
        {label}
        <span className="px-1.5 text-gray-300">·</span>
        Net
      </p>
      <p
        className={`mt-1 text-5xl font-semibold tabular-nums tracking-tight ${
          expensesReady && net < 0 ? "text-brand-red" : "text-gray-950"
        }`}
      >
        {expensesReady ? formatCurrency(net) : "—"}
      </p>
      <p className="mt-3 text-[15px] text-gray-500">
        <span className="font-medium text-gray-950">{formatCurrency(gross)}</span> gross
        <span className="px-2 text-gray-300">−</span>
        <span className="font-medium text-gray-950">
          {expensesReady ? formatCurrency(expenses) : "—"}
        </span>{" "}
        expenses
      </p>

      {showSplit ? (
        <div className="mt-4">
          <div className="flex h-4 w-full min-w-0 overflow-hidden rounded-full bg-black/5">
            {activeSlices.map((slice) => (
              <div
                key={slice.type}
                className="h-full min-w-0"
                style={{
                  width: `${(slice.amount / splitScale) * 100}%`,
                  backgroundColor: EXPENSE_COLORS[slice.type],
                }}
                title={`${slice.type} ${formatCurrency(slice.amount)}`}
              />
            ))}
            {net > 0 ? (
              <div
                className="h-full min-w-0 flex-1"
                style={{ backgroundColor: NET_COLOR }}
                title={`Net ${formatCurrency(net)}`}
              />
            ) : null}
          </div>
          <div className="mt-3 grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-baseline gap-x-3 gap-y-2">
            {activeSlices.map((slice) => (
              <div key={slice.type} className="col-span-4 grid grid-cols-subgrid items-baseline">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-black/10"
                  style={{ backgroundColor: EXPENSE_COLORS[slice.type] }}
                />
                <span className="min-w-0 truncate text-sm font-medium text-gray-950">{slice.type}</span>
                <span className="text-sm font-semibold tabular-nums text-gray-950">
                  {formatCurrency(slice.amount)}
                </span>
                <span className="w-8 text-right text-sm tabular-nums text-gray-400">
                  {gross > 0 ? `${Math.round((slice.amount / gross) * 100)}%` : ""}
                </span>
              </div>
            ))}
            {net > 0 ? (
              <div className="col-span-4 grid grid-cols-subgrid items-baseline">
                <span className="inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: NET_COLOR }} />
                <span className="text-sm font-medium text-gray-950">Net</span>
                <span className="text-sm font-semibold tabular-nums text-gray-950">{formatCurrency(net)}</span>
                <span className="w-8 text-right text-sm tabular-nums text-gray-400">
                  {gross > 0 ? `${Math.round((net / gross) * 100)}%` : ""}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showCollection ? (
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <p className="font-medium text-gray-950">{formatCurrency(collected)} collected</p>
            <p className="text-gray-500">{formatCurrency(outstanding ?? 0)} unpaid</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full bg-gray-900" style={{ width: `${collectedShare}%` }} />
          </div>
        </div>
      ) : null}

      {stats.length > 0 ? (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dd className="text-lg font-semibold tabular-nums tracking-tight text-gray-950">
                {stat.value}
              </dd>
              <dt className="text-sm text-gray-500">{stat.label}</dt>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
