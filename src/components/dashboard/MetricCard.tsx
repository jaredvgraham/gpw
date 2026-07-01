import type { LucideIcon } from "lucide-react";

const ACCENT_STYLES = {
  blue: { bg: "bg-blue-50", text: "text-brand-blue", ring: "ring-blue-100" },
  green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-100" },
  red: { bg: "bg-red-50", text: "text-brand-red", ring: "ring-red-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
} as const;

export default function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "blue",
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENT_STYLES;
  trend?: { value: string; positive: boolean };
}) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className="rounded-xl border border-brand-border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1.5 text-xl font-bold text-brand-black tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs leading-relaxed text-gray-500">{sub}</p>}
          {trend && (
            <p
              className={`mt-1.5 text-xs font-semibold ${
                trend.positive ? "text-green-600" : "text-brand-red"
              }`}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-2.5 shrink-0 ring-1 ${styles.bg} ${styles.ring}`}>
          <Icon className={`h-5 w-5 ${styles.text}`} />
        </div>
      </div>
    </div>
  );
}
