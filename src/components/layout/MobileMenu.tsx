"use client";

import Link from "next/link";
import {
  Calendar,
  Briefcase,
  Users,
  LayoutDashboard,
  Settings,
  X,
} from "lucide-react";

const links = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/dashboard", label: "Reports", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  currentPath: string;
}

export default function MobileMenu({
  open,
  onClose,
  currentPath,
}: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col safe-area-bottom">
        <div className="flex items-center justify-between px-4 py-4 border-b border-brand-border">
          <p className="font-bold text-brand-black">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              currentPath === href || currentPath.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  active
                    ? "bg-brand-blue text-white"
                    : "text-gray-700 active:bg-brand-gray"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
