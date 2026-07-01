"use client";

import type { Job } from "@/types";
import { useAppData } from "@/contexts/AppDataContext";
import { getJobHouseholdDisplay } from "@/lib/household-display";
import HouseholdBadge, { HouseholdMemberLine } from "@/components/customers/HouseholdBadge";

export default function JobCustomerHeader({
  job,
  showMembers = true,
  compact = false,
}: {
  job: Job;
  showMembers?: boolean;
  compact?: boolean;
}) {
  const { jobs } = useAppData();
  const display = getJobHouseholdDisplay(job, jobs);
  const customerId =
    typeof job.customer === "object" && job.customer !== null ? job.customer._id : undefined;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3
          className={`font-semibold text-brand-black ${
            compact ? "text-sm truncate" : ""
          }`}
        >
          {display.primaryName}
        </h3>
        {display.memberCount > 1 && (
          <HouseholdBadge
            label={`${display.memberCount} people`}
            memberCount={display.memberCount}
            compact={compact}
          />
        )}
      </div>

      {display.memberCount > 1 && display.householdLabel && (
        <p className={`mt-0.5 text-brand-blue ${compact ? "text-[11px]" : "text-xs"} font-medium`}>
          {display.householdLabel}
        </p>
      )}

      {showMembers && display.otherMemberNames.length > 0 && (
        <HouseholdMemberLine names={display.otherMemberNames} customerId={customerId} />
      )}
    </div>
  );
}
