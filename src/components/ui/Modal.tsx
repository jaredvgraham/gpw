"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          "relative w-full bg-white shadow-xl max-h-[92dvh] md:max-h-[90vh] overflow-y-auto",
          "rounded-t-2xl md:rounded-xl",
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border sticky top-0 bg-white z-10">
          <div className="md:hidden w-10" />
          <h2 className="text-lg font-semibold text-brand-black flex-1 text-center md:text-left">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-brand-gray hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 pb-8 safe-area-bottom">{children}</div>
      </div>
    </div>
  );
}
