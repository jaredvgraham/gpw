"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  bare = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  bare?: boolean;
}) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 overscroll-contain">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className={cn(
          "relative w-full bg-white shadow-2xl ring-1 ring-black/5 max-h-[92dvh] md:max-h-[90vh] overflow-y-auto overscroll-contain",
          bare ? "rounded-t-3xl md:rounded-3xl" : "rounded-t-3xl md:rounded-2xl",
          sizes[size]
        )}
      >
        {bare ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm">
            <div className="md:hidden w-10" />
            <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold tracking-tight text-gray-900 md:text-left">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-brand-gray hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={bare ? "safe-area-bottom" : "p-5 pb-8 safe-area-bottom"}>{children}</div>
      </div>
    </div>
  );
}
