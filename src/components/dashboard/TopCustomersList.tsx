import { formatCurrency } from "@/lib/utils";
import type { CustomerInsight } from "@/lib/household-display";
import HouseholdBadge from "@/components/customers/HouseholdBadge";

const BAR_COLORS = {
  blue: "bg-brand-blue",
  red: "bg-brand-red",
  green: "bg-green-500",
};

export default function TopCustomersList({
  items,
  color = "blue",
  emptyMessage = "No customers this year.",
}: {
  items: CustomerInsight[];
  color?: "blue" | "red" | "green";
  emptyMessage?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.revenue), 1);

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.key}>
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-gray text-[10px] font-bold text-gray-500">
                  {index + 1}
                </span>
                <span className="truncate font-medium text-gray-800">{item.name}</span>
                {item.isHousehold && (
                  <HouseholdBadge
                    label={`${item.memberNames.length} people`}
                    memberCount={item.memberNames.length}
                    compact
                  />
                )}
              </div>
              {item.isHousehold && (
                <p className="mt-1 pl-7 text-xs text-gray-500">
                  {item.memberNames.join(" · ")}
                </p>
              )}
              {item.address && (
                <p className="mt-0.5 pl-7 text-xs text-gray-400">{item.address}</p>
              )}
            </div>
            <span className="shrink-0 font-bold tabular-nums text-brand-black">
              {formatCurrency(item.revenue)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-gray">
            <div
              className={`h-full rounded-full transition-all ${BAR_COLORS[color]}`}
              style={{ width: `${(item.revenue / maxValue) * 100}%` }}
            />
          </div>
          <p className="mt-1 pl-7 text-xs text-gray-500">
            {item.count} job{item.count !== 1 ? "s" : ""}
            {item.isHousehold ? " at this address" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
