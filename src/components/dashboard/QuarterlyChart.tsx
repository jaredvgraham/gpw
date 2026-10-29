import { formatCurrency } from "@/lib/utils";
import type { QuarterlyRevenue } from "@/lib/dashboard-stats";

export default function QuarterlyChart({ data }: { data: QuarterlyRevenue[] }) {
  const maxValue = Math.max(...data.map((quarter) => quarter.revenue), 1);

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
      {data.map((quarter) => (
        <div key={quarter.quarter}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-gray-500">{quarter.label}</p>
            <p className="text-sm font-semibold tabular-nums text-gray-950">
              {formatCurrency(quarter.revenue)}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-blue"
              style={{ width: `${quarter.revenue > 0 ? (quarter.revenue / maxValue) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {quarter.jobs} job{quarter.jobs !== 1 ? "s" : ""} · {quarter.completed} done
          </p>
        </div>
      ))}
    </div>
  );
}
