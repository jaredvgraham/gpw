"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Briefcase, Users, BarChart3, Plus } from "lucide-react";
import { useJobModals } from "@/contexts/JobModalContext";

const tabs = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "__new__", label: "New Job", icon: Plus, action: "new" as const },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/dashboard", label: "Reports", icon: BarChart3 },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { openNewJob } = useJobModals();

  return (
    <nav className="shrink-0 z-40 md:hidden bg-white border-t border-brand-border safe-area-bottom">
      <div className="flex items-stretch justify-around px-1 pt-1 pb-2">
        {tabs.map(({ href, label, icon: Icon, action }) => {
          if (action === "new") {
            return (
              <button
                key={href}
                type="button"
                onClick={() => openNewJob()}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] rounded-lg transition-colors text-gray-500"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          }

          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(`${href}/`);

          const activeColor = active ? "text-brand-red" : "text-gray-500";

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] rounded-lg transition-colors ${activeColor}`}
            >
              <Icon className={`h-5 w-5 ${activeColor}`} />
              <span className={`text-[10px] font-medium ${activeColor}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
