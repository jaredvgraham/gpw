"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Sun, Scale, Megaphone, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/split", label: "Split", icon: Scale },
  { href: "/leads", label: "Leads", icon: Megaphone },
  { href: "/dashboard", label: "Reports", icon: BarChart3 },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [intent, setIntent] = useState<string | null>(null);
  const [intentPath, setIntentPath] = useState(pathname);

  if (pathname !== intentPath) {
    setIntentPath(pathname);
    setIntent(null);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:hidden">
      <div className="flex items-end justify-around px-1 pb-0.5 pt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const selected = intent ? href === intent : active;
          return (
            <Link
              key={href}
              href={href}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                setIntent(href);
                const tab = event.currentTarget;
                const release = (ev: PointerEvent) => {
                  window.removeEventListener("pointerup", release);
                  window.removeEventListener("pointercancel", cancel);
                  const hit = document.elementFromPoint(ev.clientX, ev.clientY);
                  if (!hit || !tab.contains(hit)) {
                    setIntent((current) => (current === href ? null : current));
                  }
                };
                const cancel = () => {
                  window.removeEventListener("pointerup", release);
                  window.removeEventListener("pointercancel", cancel);
                  setIntent((current) => (current === href ? null : current));
                };
                window.addEventListener("pointerup", release);
                window.addEventListener("pointercancel", cancel);
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-0.5 touch-manipulation",
                selected ? "text-brand-red" : "text-gray-600"
              )}
            >
              <Icon
                className="h-[22px] w-[22px]"
                strokeWidth={selected ? 2.5 : 1.75}
                fill={selected ? "currentColor" : "none"}
                fillOpacity={selected ? 0.15 : 0}
              />
              <span className={cn("text-[10px]", selected ? "font-semibold" : "font-normal")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
