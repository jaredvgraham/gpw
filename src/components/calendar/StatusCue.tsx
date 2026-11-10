import { jobCueColor, jobCueLabel, type JobStatus } from "@/lib/constants";

export default function StatusCue({
  status,
  paid,
  size = "sm",
}: {
  status: JobStatus;
  paid?: boolean;
  size?: "sm" | "xs";
}) {
  const color = jobCueColor({ status, paid });
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${
        size === "xs" ? "text-[10px] leading-none" : "text-[10px]"
      }`}
      style={{ color }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {jobCueLabel({ status, paid })}
    </span>
  );
}
