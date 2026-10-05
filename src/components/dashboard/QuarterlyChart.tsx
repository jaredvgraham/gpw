import { formatCurrency } from "@/lib/utils";
import type { QuarterlyRevenue } from "@/lib/dashboard-stats";

export default function QuarterlyChart({ data }: { data: QuarterlyRevenue[] }) {
  const maxValue = Math.max(...data.map((quarter) => quarter.revenue), 1);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {data.map((quarter) => {
        const barHeight = quarter.revenue > 0 ? Math.max(8, (quarter.revenue / maxValue) * 100) : 0;

        return (
          <div
            key={quarter.quarter}
            className="rounded-xl border border-brand-border bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-brand-blue">{quarter.label}</p>
              <p className="text-lg font-bold tabular-nums text-brand-black">
                {formatCurrency(quarter.revenue)}
              </p>
            </div>

            <div className="h-20 rounded-lg bg-brand-gray/60 overflow-hidden flex items-end">
              <div
                className="w-full rounded-t-md bg-brand-blue transition-all"
                style={{ height: `${barHeight}%` }}
              />
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <p>
                {quarter.jobs} job{quarter.jobs !== 1 ? "s" : ""} · {quarter.completed} done
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
