import { jobCueColor, jobCueLabel, type JobStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function StatusBadge({
  status,
  paid,
  className,
}: {
  status: JobStatus;
  paid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
        className
      )}
      style={{ backgroundColor: jobCueColor({ status, paid }) }}
    >
      {jobCueLabel({ status, paid })}
    </span>
  );
}
