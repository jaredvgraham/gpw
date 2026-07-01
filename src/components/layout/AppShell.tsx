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
      <div className="flex min-h-screen bg-brand-gray max-md:h-dvh max-md:overflow-hidden">
        <Sidebar currentPath={pathname} />
        <div className="flex flex-1 flex-col min-h-0 min-w-0 max-md:overflow-hidden">
          <main
            className={`flex-1 flex flex-col min-h-0 min-w-0 ${
              isCalendar ? "max-md:overflow-hidden" : "overflow-auto"
            }`}
          >
            {!isCalendar && (
              <div className="md:hidden shrink-0">
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
                  ? "flex-1 flex flex-col min-h-0 overflow-hidden p-0 md:p-4 md:overflow-auto"
                  : "p-4 md:p-8 pt-0 md:pt-8 pb-4 md:pb-8"
              }
            >
              <div
                className={
                  isCalendar ? "flex-1 flex flex-col min-h-0 overflow-hidden" : ""
                }
              >
                {children}
              </div>
            </div>
          </main>
          <MobileNav />
        </div>
      </div>
    </JobModalProvider>
  );
}
