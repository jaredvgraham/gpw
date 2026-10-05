"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileMenu from "./MobileMenu";
import MobilePageFooter from "./MobilePageFooter";
import MobileBottomNav from "./MobileBottomNav";
import DataSyncIndicator from "./DataSyncIndicator";
import { JobModalProvider } from "@/contexts/JobModalContext";
import { AppDataProvider } from "@/contexts/AppDataContext";

const BOTTOM_NAV_PATHS = ["/calendar", "/today", "/split", "/leads", "/dashboard"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCalendar = pathname === "/calendar";
  const showBottomNav = BOTTOM_NAV_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isToday = pathname === "/today";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AppDataProvider>
      <JobModalProvider>
      <div className="flex min-h-screen bg-brand-gray max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:overflow-hidden md:h-dvh md:max-h-dvh md:overflow-hidden">
        <Sidebar currentPath={pathname} />
        <div className="flex flex-1 flex-col min-h-0 min-w-0 max-md:overflow-hidden">
          <main
            className={`flex-1 flex flex-col min-h-0 min-w-0 ${
              isCalendar
                ? showBottomNav
                  ? "max-md:overflow-hidden calendar-bottom-nav-inset"
                  : "max-md:overflow-hidden"
                : showBottomNav
                  ? "overflow-x-hidden overflow-y-auto overscroll-x-none main-with-bottom-nav"
                  : "overflow-x-hidden overflow-y-auto overscroll-x-none"
            }`}
          >
            {!isCalendar && (
              <div className="md:hidden shrink-0">
                <MobileHeader
                  onMenuOpen={() => setMenuOpen(true)}
                  variant={isToday ? "itinerary" : "default"}
                />
                <DataSyncIndicator />
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
                  : isToday
                    ? "flex-1 flex flex-col min-h-0 overflow-auto bg-[#f4f5f7] px-4 pt-0 pb-4 md:overflow-hidden md:bg-transparent md:p-6 md:pt-6 md:pb-6"
                    : "p-4 md:p-8 pt-0 md:pt-8 pb-4 md:pb-8"
              }
            >
              <div
                className={
                  isCalendar
                    ? "flex-1 flex flex-col min-h-0 overflow-hidden"
                    : isToday
                      ? "md:flex md:h-full md:min-h-0 md:flex-1 md:flex-col"
                      : ""
                }
              >
                {children}
                {!isCalendar && !showBottomNav && <MobilePageFooter />}
                {showBottomNav && !isCalendar && (
                  <div className="md:hidden bottom-nav-clearance shrink-0" aria-hidden />
                )}
              </div>
            </div>
          </main>
          {showBottomNav && <MobileBottomNav />}
        </div>
      </div>
      </JobModalProvider>
    </AppDataProvider>
  );
}
