/** Work-day hours in list order: 8 → 12 → 1 → 5 (AM through noon, then PM). */
const WORK_DAY_HOURS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5] as const;

const MINUTES = [0, 15, 30, 45] as const;

function periodForWorkHour(hour: number): "AM" | "PM" {
  return hour >= 8 && hour <= 11 ? "AM" : "PM";
}

function workHourToTime24(hour: number, minute: number): string {
  let hours = hour % 12;
  if (periodForWorkHour(hour) === "PM") hours += 12;
  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export const TIME_SLOT_OPTIONS = (() => {
  const options: { value: string; label: string }[] = [];
  for (const hour of WORK_DAY_HOURS) {
    const period = periodForWorkHour(hour);
    for (const minute of MINUTES) {
      const mm = String(minute).padStart(2, "0");
      options.push({
        value: workHourToTime24(hour, minute),
        label: `${hour}:${mm} ${period}`,
      });
    }
  }
  return options;
})();

export function snapToTimeSlot(time24: string): string {
  const exact = TIME_SLOT_OPTIONS.find((opt) => opt.value === time24);
  if (exact) return time24;

  const [hours, minutes] = time24.split(":").map(Number);
  const target = hours * 60 + minutes;

  let closest = TIME_SLOT_OPTIONS[0].value;
  let minDiff = Infinity;

  for (const opt of TIME_SLOT_OPTIONS) {
    const [h, m] = opt.value.split(":").map(Number);
    const diff = Math.abs(h * 60 + m - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt.value;
    }
  }

  return closest;
}
