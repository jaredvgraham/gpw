"use client";

import { Menu, Plus, Droplets } from "lucide-react";
import { useJobModals } from "@/contexts/JobModalContext";

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  const { openNewJob } = useJobModals();

  return (
    <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-brand-border">
      <button
        type="button"
        onClick={onMenuOpen}
        className="rounded-lg p-2 text-gray-600 active:bg-brand-gray"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white">
          <Droplets className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-bold tracking-wide text-brand-black uppercase truncate">
            Graham Power Washing
          </p>
        </div>
      </div>

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
