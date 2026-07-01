"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MobileHeader from "./MobileHeader";
import MobileMenu from "./MobileMenu";
import { useState } from "react";
import { JobModalProvider } from "@/contexts/JobModalContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCalendar = pathname === "/calendar";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <JobModalProvider>
      <div className="flex min-h-screen bg-brand-gray">
        <Sidebar currentPath={pathname} />
        <main className="flex-1 overflow-auto">
          {!isCalendar && (
            <div className="md:hidden">
              <MobileHeader onMenuOpen={() => setMenuOpen(true)} />
              <MobileMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                currentPath={pathname}
              />
            </div>
          )}
          <div
            className={
              isCalendar
                ? "p-0 md:p-4 h-dvh md:h-screen pb-[4.5rem] md:pb-4 overflow-hidden md:overflow-auto"
                : "p-4 md:p-8 pt-0 md:pt-8 pb-24 md:pb-8"
            }
          >
            <div className={isCalendar ? "h-full md:p-0" : ""}>{children}</div>
          </div>
        </main>
        <MobileNav />
      </div>
    </JobModalProvider>
  );
}
