"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  className?: string;
  listMaxHeight?: string;
}

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  error,
  disabled,
  id,
  ariaLabel,
  className,
  listMaxHeight = "14rem",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLLIElement>(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      selectedOptionRef.current?.scrollIntoView({ block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl border border-brand-border bg-white px-3 py-2.5 text-base md:text-sm font-medium text-brand-black shadow-sm transition-colors",
          "hover:border-gray-300 hover:bg-brand-gray/40 active:bg-brand-gray/60",
          open && "border-brand-blue ring-2 ring-brand-blue/20",
          error && "border-brand-red ring-brand-red/20",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className={cn("truncate text-left", !selected && "text-gray-400 font-normal")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180 text-brand-blue"
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-[70] mt-1.5 w-full overflow-y-auto overscroll-contain rounded-xl border border-brand-border bg-white py-1.5 shadow-xl"
          style={{ maxHeight: listMaxHeight }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                ref={isSelected ? selectedOptionRef : undefined}
                role="option"
                aria-selected={isSelected}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-blue-50 font-semibold text-brand-blue"
                      : "text-gray-700 hover:bg-brand-gray active:bg-brand-gray"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
