"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  Settings,
  Droplets,
  Megaphone,
  Scale,
  Sun,
} from "lucide-react";
import { useJobModals } from "@/contexts/JobModalContext";
import DataSyncIndicator from "./DataSyncIndicator";

const navGroups = [
  [
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/today", label: "Today", icon: Sun },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/leads", label: "Leads", icon: Megaphone },
  ],
  [
    { href: "/split", label: "Split", icon: Scale },
    { href: "/dashboard", label: "Reports", icon: LayoutDashboard },
  ],
  [{ href: "/settings", label: "Settings", icon: Settings }],
];

export default function Sidebar({ currentPath }: { currentPath: string }) {
  const { openNewJob } = useJobModals();

  return (
    <aside className="hidden md:flex h-dvh w-60 shrink-0 flex-col border-r border-brand-border bg-white">
      <div className="flex items-center gap-3 border-b border-brand-border px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-white">
          <Droplets className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-brand-black">Graham Painting</p>
          <p className="text-xs text-gray-500">& Power Washing</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navGroups.map((group, index) => (
          <div key={index} className="space-y-1">
            {index > 0 && <div className="mx-2 mb-2 border-t border-brand-border" />}
            {group.map(({ href, label, icon: Icon }) => {
              const active = currentPath === href || currentPath.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-brand-blue text-white" : "text-gray-700 hover:bg-brand-gray"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 pb-2">
        <DataSyncIndicator className="rounded-lg border border-brand-border" />
      </div>

      <div className="border-t border-brand-border px-4 py-4">
        <button
          type="button"
          onClick={() => openNewJob()}
          className="flex w-full items-center justify-center rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          + Add Job
        </button>
      </div>
    </aside>
  );
}
