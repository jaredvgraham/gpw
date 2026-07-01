import { format } from "date-fns";

/** Parse YYYY-MM-DD as a stable UTC noon date (avoids timezone day shifts). */
export function parseJobDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/** Get YYYY-MM-DD from a stored job date without local timezone shifting. */
export function getJobDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a job date for display (always the intended calendar day). */
export function formatJobDate(value: string | Date): string {
  const [year, month, day] = getJobDateOnly(value).split("-").map(Number);
  return format(new Date(year, month - 1, day), "MMM d, yyyy");
}

/** Build ISO local datetime strings for FullCalendar from date + time. */
export function jobDateTimeStrings(
  jobDate: string | Date,
  startTime: string,
  endTime: string
): { start: string; end: string } {
  const dateStr = getJobDateOnly(jobDate);

  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  let endDateStr = dateStr;
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
    endDateStr = getJobDateOnly(next);
  }

  return {
    start: `${dateStr}T${startTime}`,
    end: `${endDateStr}T${endTime}`,
  };
}
