"use client";

import { useEffect, useState } from "react";

export type CalendarLayoutChoice = "duo" | "desktop";

const STORAGE_KEY = "gpw-calendar-layout";
const OPTIONS: { id: CalendarLayoutChoice; label: string }[] = [
  { id: "duo", label: "Duo" },
  { id: "desktop", label: "Desktop" },
];

function readStored(): CalendarLayoutChoice {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "desktop" ? "desktop" : "duo";
  } catch {
    return "duo";
  }
}

function writeStored(value: CalendarLayoutChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be full or blocked. The choice still applies this visit.
  }
}

export function useCalendarLayoutChoice(): {
  choice: CalendarLayoutChoice;
  setChoice: (next: CalendarLayoutChoice) => void;
  ready: boolean;
} {
  const [choice, setChoiceState] = useState<CalendarLayoutChoice>("duo");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoiceState(readStored());
    setReady(true);
  }, []);

  function setChoice(next: CalendarLayoutChoice) {
    setChoiceState(next);
    writeStored(next);
  }

  return { choice, setChoice, ready };
}

export default function CalendarLayoutToggle({
  value,
  onChange,
  size = "compact",
}: {
  value: CalendarLayoutChoice;
  onChange: (value: CalendarLayoutChoice) => void;
  size?: "compact" | "touch";
}) {
  return (
    <div
      className="inline-flex shrink-0 rounded-full bg-white p-1 ring-1 ring-gray-200"
      role="group"
      aria-label="Calendar layout"
    >
      {OPTIONS.map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`rounded-full font-semibold transition ${
              size === "touch" ? "min-h-10 px-4 text-sm" : "px-3.5 py-1.5 text-sm"
            } ${active ? "bg-brand-black text-white" : "text-gray-500 hover:text-brand-black"}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
