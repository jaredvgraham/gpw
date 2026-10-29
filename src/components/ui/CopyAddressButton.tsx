"use client";

import { useState, type MouseEvent, type PointerEvent } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyAddressButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const value = text.trim();
  if (!value || value === "No address on file") return null;

  function copyWithInput() {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.top = "0";
    input.style.left = "0";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(input);
    return ok;
  }

  async function copy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const legacy = copyWithInput();
    let modern = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        modern = true;
      }
    } catch {
      modern = false;
    }
    if (!legacy && !modern) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => event.stopPropagation()}
      onClick={(event) => void copy(event)}
      aria-label={copied ? "Address copied" : "Copy address"}
      title={copied ? "Copied" : "Copy address"}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-black/5 hover:text-gray-800 ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
