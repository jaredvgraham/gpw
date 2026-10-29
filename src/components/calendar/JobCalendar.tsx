"use client";

import { useEffect, useState, useCallback } from "react";
import {
  addDays,
  addMonths,
  addYears,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  startOfWeek,
} from "date-fns";
import type { Job } from "@/types";
import { formatCurrency } from "@/lib/utils";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import MobileDaySheet from "@/components/calendar/MobileDaySheet";
import MobileCalendarView from "@/components/calendar/mobile/MobileCalendarView";
import DesktopCalendarChrome, { type CalendarStat } from "@/components/calendar/desktop/DesktopCalendarChrome";
import DesktopMonthBoard from "@/components/calendar/desktop/DesktopMonthBoard";
import DesktopYearBoard from "@/components/calendar/desktop/DesktopYearBoard";
import DesktopDayBoard from "@/components/calendar/desktop/DesktopDayBoard";
import DesktopWeekBoard from "@/components/calendar/desktop/DesktopWeekBoard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useJobModals } from "@/contexts/JobModalContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  bookedTotal,
  dueTotal,
  jobsBetween,
  toIsoDate,
  type DesktopView,
  viewInterval,
} from "@/components/calendar/desktop/model";

function headingFor(view: DesktopView, cursor: Date) {
  if (view === "dayGridMonth") {
    return { primary: format(cursor, "MMMM"), secondary: format(cursor, "yyyy") };
  }
  if (view === "multiMonthYear") {
    return { primary: format(cursor, "yyyy") };
  }
  if (view === "listDay") {
    return { primary: format(cursor, "MMMM d"), secondary: format(cursor, "EEEE") };
  }
  const start = startOfWeek(cursor, { weekStartsOn: 0 });
  const end = endOfWeek(cursor, { weekStartsOn: 0 });
  if (start.getMonth() === end.getMonth()) {
    return { primary: `${format(start, "MMMM d")}–${format(end, "d")}`, secondary: format(start, "yyyy") };
  }
  return {
    primary: `${format(start, "MMM d")} – ${format(end, "MMM d")}`,
    secondary: format(end, "yyyy"),
  };
}

function buildStats(jobs: Job[]): CalendarStat[] {
  if (jobs.length === 0) return [];
  const done = jobs.filter((job) => job.status === "Completed").length;
  const follow = jobs.filter((job) => job.status === "Needs Follow-Up").length;
  const cancelled = jobs.filter((job) => job.status === "Cancelled").length;
  const due = dueTotal(jobs);
  const stats: CalendarStat[] = [
    { value: String(jobs.length), label: jobs.length === 1 ? "job" : "jobs" },
    { value: formatCurrency(bookedTotal(jobs)), label: "booked" },
  ];
  if (done > 0) stats.push({ value: String(done), label: "done", tone: "good" });
  if (follow > 0) {
    stats.push({ value: String(follow), label: follow === 1 ? "follow up" : "follow ups", tone: "alert" });
  }
  if (due > 0) stats.push({ value: formatCurrency(due), label: "due", tone: "alert" });
  if (cancelled > 0) stats.push({ value: String(cancelled), label: "cancelled", tone: "muted" });
  return stats;
}

export default function JobCalendar() {
  const isMobile = useIsMobile();
  const { openNewJob } = useJobModals();
  const { jobs, jobsLoading: loading } = useAppData();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DesktopView>("dayGridMonth");
  const [cursor, setCursor] = useState(() => new Date());
  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  const openJob = useCallback((job: Job) => {
    setSelectedJob(job);
    setModalOpen(true);
  }, []);

  const openDayView = useCallback((date: Date) => {
    setDaySheetDate(date);
    setDaySheetOpen(true);
  }, []);

  const openNewJobModal = useCallback(
    (jobDate: string, startTime: string, endTime: string) => {
      openNewJob({ jobDate, startTime, endTime });
    },
    [openNewJob]
  );

  useEffect(() => {
    setSelectedJob((current) =>
      current ? jobs.find((job) => job._id === current._id) ?? current : null
    );
  }, [jobs]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (modalOpen || daySheetOpen) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setCursor((current) => {
        if (currentView === "dayGridMonth") return addMonths(current, direction);
        if (currentView === "multiMonthYear") return addYears(current, direction);
        if (currentView === "timeGridWeek") return addDays(current, direction * 7);
        return addDays(current, direction);
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentView, modalOpen, daySheetOpen]);

  function goToday() {
    setCursor(new Date());
  }

  function shift(direction: number) {
    setCursor((current) => {
      if (currentView === "dayGridMonth") return addMonths(current, direction);
      if (currentView === "multiMonthYear") return addYears(current, direction);
      if (currentView === "timeGridWeek") return addDays(current, direction * 7);
      return addDays(current, direction);
    });
  }

  function jumpToMonth(value: string) {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return;
    const day = Math.min(cursor.getDate(), new Date(year, month, 0).getDate());
    setCursor(new Date(year, month - 1, day));
  }

  function jumpToDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return;
    setCursor(new Date(year, month - 1, day));
  }

  if (isMobile) {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <MobileCalendarView jobs={jobs} loading={loading} />
      </div>
    );
  }

  const today = new Date();
  const todayDisabled =
    currentView === "dayGridMonth"
      ? isSameMonth(cursor, today)
      : currentView === "multiMonthYear"
        ? isSameYear(cursor, today)
        : currentView === "timeGridWeek"
          ? isSameWeek(cursor, today, { weekStartsOn: 0 })
          : isSameDay(cursor, today);
  const heading = headingFor(currentView, cursor);
  const interval = viewInterval(currentView, cursor);
  const stats = buildStats(jobsBetween(jobs, interval.start, interval.end));
  const prevLabel =
    currentView === "dayGridMonth" ? "Previous month" : currentView === "multiMonthYear" ? "Previous year" : currentView === "timeGridWeek" ? "Previous week" : "Previous day";
  const nextLabel =
    currentView === "dayGridMonth" ? "Next month" : currentView === "multiMonthYear" ? "Next year" : currentView === "timeGridWeek" ? "Next week" : "Next day";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DesktopCalendarChrome
        primary={heading.primary}
        secondary={heading.secondary}
        stats={stats}
        view={currentView}
        onView={setCurrentView}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onToday={goToday}
        todayDisabled={todayDisabled}
        prevLabel={prevLabel}
        nextLabel={nextLabel}
        jump={
          currentView === "listDay"
            ? { kind: "date", value: toIsoDate(cursor), label: "Jump to a day", onChange: jumpToDate }
            : currentView === "multiMonthYear"
              ? undefined
              : { kind: "month", value: format(cursor, "yyyy-MM"), label: "Jump to a month", onChange: jumpToMonth }
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading && jobs.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {currentView === "dayGridMonth" ? (
          <DesktopMonthBoard
            cursor={cursor}
            jobs={jobs}
            onOpenDay={openDayView}
            onOpenJob={openJob}
            onAddJob={openNewJobModal}
          />
        ) : null}

        {currentView === "multiMonthYear" ? (
          <DesktopYearBoard
            cursor={cursor}
            jobs={jobs}
            onOpenDay={openDayView}
            onOpenMonth={(date) => {
              setCursor(date);
              setCurrentView("dayGridMonth");
            }}
          />
        ) : null}

        {currentView === "listDay" ? (
          <DesktopDayBoard cursor={cursor} jobs={jobs} onOpenJob={openJob} onAddJob={openNewJobModal} />
        ) : null}

        {currentView === "timeGridWeek" ? (
          <DesktopWeekBoard
            cursor={cursor}
            jobs={jobs}
            onOpenDay={(date) => {
              setCursor(date);
              setCurrentView("listDay");
            }}
            onOpenJob={openJob}
            onAddJob={openNewJobModal}
          />
        ) : null}
      </div>

      <JobDetailsModal
        job={selectedJob}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdated={() => {
          setSelectedJob((current) =>
            current ? jobs.find((job) => job._id === current._id) ?? null : null
          );
        }}
      />

      <MobileDaySheet
        open={daySheetOpen}
        date={daySheetDate}
        jobs={jobs}
        onClose={() => setDaySheetOpen(false)}
        onJobClick={(job) => {
          setDaySheetOpen(false);
          openJob(job);
        }}
        onAddJob={(jobDate, startTime, endTime) => {
          setDaySheetOpen(false);
          openNewJobModal(jobDate, startTime, endTime);
        }}
      />
    </div>
  );
}
