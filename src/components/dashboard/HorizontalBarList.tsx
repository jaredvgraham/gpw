import { formatCurrency } from "@/lib/utils";

interface BarItem {
  name: string;
  value: number;
  sub?: string;
}

const BAR_COLORS = {
  blue: "bg-brand-blue",
  red: "bg-brand-red",
  green: "bg-green-500",
};

export default function HorizontalBarList({
  items,
  color = "blue",
  emptyMessage = "No data yet.",
}: {
  items: BarItem[];
  color?: "blue" | "red" | "green";
  emptyMessage?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3.5">
      {items.map((item, index) => (
        <div key={item.name}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-gray text-[10px] font-bold text-gray-500">
                {index + 1}
              </span>
              <span className="truncate font-medium text-gray-800">{item.name}</span>
            </span>
            <span className="shrink-0 font-bold tabular-nums text-brand-black">
              {formatCurrency(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-gray">
            <div
              className={`h-full rounded-full transition-all ${BAR_COLORS[color]}`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          {item.sub && <p className="mt-1 pl-7 text-xs text-gray-500">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}
