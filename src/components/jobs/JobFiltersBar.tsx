"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { JOB_STATUSES } from "@/lib/constants";

export interface JobFilters {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
  service: string;
  city: string;
}

interface JobFiltersBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  services: string[];
}

export default function JobFiltersBar({ filters, onChange, services }: JobFiltersBarProps) {
  function update(key: keyof JobFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function clear() {
    onChange({
      search: "",
      status: "",
      startDate: "",
      endDate: "",
      service: "",
      city: "",
    });
  }

  return (
    <div className="rounded-xl bg-white border border-brand-border p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
