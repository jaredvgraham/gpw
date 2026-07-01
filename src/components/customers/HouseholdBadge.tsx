import Link from "next/link";
import { Home, Users } from "lucide-react";

export default function HouseholdBadge({
  label,
  memberCount,
  compact = false,
}: {
  label: string;
  memberCount: number;
  compact?: boolean;
}) {
  if (memberCount <= 1) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-blue-50 text-brand-blue font-medium ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {compact ? <Users className="h-3 w-3" /> : <Home className="h-3 w-3" />}
      {compact ? `${memberCount}` : label}
    </span>
  );
}

export function HouseholdMemberLine({
  names,
  customerId,
}: {
  names: string[];
  customerId?: string;
}) {
  if (names.length === 0) return null;

  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
      <Users className="h-3 w-3 shrink-0 text-brand-blue" />
      <span>Also at this address:</span>
      {names.map((name, index) => (
        <span key={name}>
          {index > 0 && ", "}
          {name}
        </span>
      ))}
      {customerId && (
        <>
          {" · "}
          <Link href={`/customers/${customerId}`} className="font-medium text-brand-blue hover:underline">
            Household
          </Link>
        </>
      )}
    </p>
  );
}
