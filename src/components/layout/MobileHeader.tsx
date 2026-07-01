"use client";

import { format } from "date-fns";
import { Menu, Plus, Droplets } from "lucide-react";
import { useJobModals } from "@/contexts/JobModalContext";

interface MobileHeaderProps {
  onMenuOpen: () => void;
  variant?: "default" | "itinerary";
}

function BrandLogo() {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <div className="italic leading-none">
        <p className="text-sm font-black tracking-tight text-brand-red">GRAHAM</p>
        <p className="text-[9.5px] font-black tracking-tight text-brand-blue">
          POWER WASHING
        </p>
      </div>
      <Droplets className="h-4 w-4 shrink-0 text-brand-blue" />
    </div>
  );
}

export default function MobileHeader({
  onMenuOpen,
  variant = "default",
}: MobileHeaderProps) {
  const { openNewJob } = useJobModals();

  if (variant === "itinerary") {
    return (
      <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <button
            type="button"
            onClick={onMenuOpen}
            className="shrink-0 rounded-lg p-1.5 text-gray-700 active:bg-brand-gray"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" strokeWidth={2.5} />
          </button>

          <BrandLogo />

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-base font-bold leading-tight text-gray-900">
              Today&apos;s Itinerary
            </p>
            <p className="truncate text-xs text-gray-500">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openNewJob()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red text-white shadow-sm active:bg-red-700"
            aria-label="Add job"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-brand-border">
      <button
        type="button"
        onClick={onMenuOpen}
        className="rounded-lg p-2 text-gray-600 active:bg-brand-gray"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <BrandLogo />

      <button
        type="button"
        onClick={() => openNewJob()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red text-white shadow-md active:bg-red-700"
        aria-label="Add job"
      >
        <Plus className="h-5 w-5" />
      </button>
    </header>
  );
}
