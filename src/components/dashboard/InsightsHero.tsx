import { formatCurrency } from "@/lib/utils";

export default function InsightsHero({
  title,
  revenue,
  collected,
  jobs,
  meta,
}: {
  title: string;
  revenue: number;
  collected: number;
  jobs: number;
  meta?: string;
}) {
  const collectionRate = revenue > 0 ? Math.round((collected / revenue) * 100) : 0;

  return (
    <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-white to-blue-50/40 p-5 sm:p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-brand-black">
        {formatCurrency(revenue)}
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-green-600">{formatCurrency(collected)}</span> collected
        </span>
        <span className="text-gray-600">
          <span className="font-semibold text-brand-black">{collectionRate}%</span> collection rate
        </span>
        <span className="text-gray-600">
          <span className="font-semibold text-brand-black">{jobs}</span> job{jobs !== 1 ? "s" : ""}
        </span>
        {meta && <span className="text-gray-500">{meta}</span>}
      </div>
    </div>
  );
}
