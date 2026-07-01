import { formatTime, getCustomerName } from "@/lib/utils";
import type { Job } from "@/types";

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

type SchedulableJob = {
  _id: string | { toString(): string };
  startTime: string;
  endTime: string;
  customer?: unknown;
};

export function findJobTimeConflict(
  existingJobs: SchedulableJob[],
  startTime: string,
  endTime: string,
  excludeJobId?: string
): string | null {
  for (const existing of existingJobs) {
    if (excludeJobId && String(existing._id) === excludeJobId) continue;

    if (timeRangesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
      const name = getCustomerName(existing as Job);
      const range = `${formatTime(existing.startTime)} – ${formatTime(existing.endTime)}`;
      return `This time overlaps with ${name} (${range})`;
    }
  }

  return null;
}
