"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  Settings,
  Droplets,
} from "lucide-react";
import { useJobModals } from "@/contexts/JobModalContext";

const navItems = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ currentPath }: { currentPath: string }) {
  const { openNewJob } = useJobModals();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-brand-border">
      <div className="flex items-center gap-3 px-4 py-6 border-b border-brand-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue text-white">
          <Droplets className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-brand-black leading-tight">Graham Painting</p>
          <p className="text-xs text-gray-500">& Power Washing</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = currentPath === href || currentPath.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-brand-blue text-white" : "text-gray-700 hover:bg-brand-gray"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-brand-border">
        <button
          type="button"
          onClick={() => openNewJob()}
          className="flex w-full items-center justify-center rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          + Add Job
        </button>
      </div>
    </aside>
  );
}
