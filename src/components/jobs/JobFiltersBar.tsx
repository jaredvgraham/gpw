"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { JOB_STATUSES } from "@/lib/constants";

export interface JobFilters {
  search: string;
  status: string;
  paid: "" | "paid" | "unpaid";
  startDate: string;
  endDate: string;
  service: string;
  city: string;
}

export const JOB_QUICK_FILTERS = [
  { id: "all", label: "All", status: "", paid: "" },
  { id: "completed-unpaid", label: "Completed, unpaid", status: "Completed", paid: "unpaid" },
  { id: "unpaid", label: "Unpaid", status: "", paid: "unpaid" },
  { id: "follow-up", label: "Needs follow-up", status: "Needs Follow-Up", paid: "" },
  { id: "scheduled", label: "Scheduled", status: "Scheduled", paid: "" },
  { id: "completed", label: "Completed", status: "Completed", paid: "" },
  { id: "cancelled", label: "Cancelled", status: "Cancelled", paid: "" },
] as const;

interface JobFiltersBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  services: string[];
  counts: Record<string, number>;
}

export default function JobFiltersBar({ filters, onChange, services, counts }: JobFiltersBarProps) {
  function update(key: keyof JobFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function clear() {
    onChange({
      search: "",
      status: "",
      paid: "",
      startDate: "",
      endDate: "",
      service: "",
      city: "",
    });
  }

  return (
    <div className="rounded-xl bg-white border border-brand-border p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {JOB_QUICK_FILTERS.map((preset) => {
          const active = filters.status === preset.status && filters.paid === preset.paid;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  status: preset.status,
                  paid: preset.paid,
                })
              }
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-black text-white"
                  : "bg-brand-gray text-gray-700 hover:text-brand-black"
              }`}
            >
              {preset.label}
              <span className={active ? "text-white/70" : "text-gray-400"}> {counts[preset.id] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <Input
          label="Search"
          placeholder="Name, phone, address..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
        />
        <Select
          label="Status"
          options={[
            { value: "", label: "All Statuses" },
            ...JOB_STATUSES.map((s) => ({ value: s, label: s })),
          ]}
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
        />
        <Select
          label="Payment"
          options={[
            { value: "", label: "Paid or not" },
            { value: "unpaid", label: "Not paid" },
            { value: "paid", label: "Paid" },
          ]}
          value={filters.paid}
          onChange={(e) => update("paid", e.target.value)}
        />
        <Input
          label="Start Date"
          type="date"
          value={filters.startDate}
          onChange={(e) => update("startDate", e.target.value)}
        />
        <Input
          label="End Date"
          type="date"
          value={filters.endDate}
          onChange={(e) => update("endDate", e.target.value)}
        />
        <Select
          label="Service"
          options={[
            { value: "", label: "All Services" },
            ...services.map((s) => ({ value: s, label: s })),
          ]}
          value={filters.service}
          onChange={(e) => update("service", e.target.value)}
        />
        <Input
          label="Town/City"
          placeholder="Filter by city"
          value={filters.city}
          onChange={(e) => update("city", e.target.value)}
        />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        Clear Filters
      </Button>
    </div>
  );
}
