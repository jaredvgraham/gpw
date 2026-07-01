"use client";

import Dropdown from "@/components/ui/Dropdown";
import { snapToTimeSlot, TIME_SLOT_OPTIONS } from "@/lib/time";

interface TimeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
}

export default function TimeSelect({
  label,
  value,
  onChange,
  error,
  required,
  id,
}: TimeSelectProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const selected = snapToTimeSlot(value || "08:00");

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-brand-red ml-0.5">*</span>}
      </label>
      <Dropdown
        id={inputId}
        value={selected}
        onChange={onChange}
        options={TIME_SLOT_OPTIONS}
        error={Boolean(error)}
        ariaLabel={label}
        listMaxHeight="12rem"
      />
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}
