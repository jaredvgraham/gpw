"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Sun, Briefcase, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/dashboard", label: "Reports", icon: BarChart3 },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:hidden">
      <div className="flex items-end justify-around px-1 pb-0.5 pt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-0.5",
                active ? "text-brand-red" : "text-gray-600"
              )}
            >
              <Icon
                className="h-[22px] w-[22px]"
                strokeWidth={active ? 2.5 : 1.75}
                fill={active ? "currentColor" : "none"}
                fillOpacity={active ? 0.15 : 0}
              />
              <span className={cn("text-[10px]", active ? "font-semibold" : "font-normal")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
