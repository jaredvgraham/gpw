"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventClickArg,
  DateSelectArg,
  EventContentArg,
  DatesSetArg,
  DayHeaderContentArg,
  EventMountArg,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
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
import { jobToCalendarEvent, formatCurrency } from "@/lib/utils";
import { getJobHouseholdTitle } from "@/lib/household-display";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import MobileDaySheet from "@/components/calendar/MobileDaySheet";
import MobileCalendarView from "@/components/calendar/mobile/MobileCalendarView";
import DesktopCalendarChrome, { type CalendarStat } from "@/components/calendar/desktop/DesktopCalendarChrome";
import DesktopMonthBoard from "@/components/calendar/desktop/DesktopMonthBoard";
import DesktopYearBoard from "@/components/calendar/desktop/DesktopYearBoard";
import DesktopDayBoard from "@/components/calendar/desktop/DesktopDayBoard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useJobModals } from "@/contexts/JobModalContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  bookedTotal,
  dueTotal,
  formatTimeRange,
  jobServiceLabel,
  jobStatusMark,
  jobTown,
  jobsBetween,
  STATUS_SURFACE,
  toIsoDate,
  type DesktopView,
  viewInterval,
  yearDaySignal,
} from "@/components/calendar/desktop/model";

function paintJobEvent(el: HTMLElement, status: keyof typeof STATUS_SURFACE | undefined) {
  const surface = (status && STATUS_SURFACE[status]) || STATUS_SURFACE.Scheduled;
  el.style.backgroundColor = surface.bg;
  el.style.borderColor = surface.border;
  el.style.borderLeftColor = surface.accent;
  el.style.color = surface.ink;
  el.style.setProperty("--gpw-accent", surface.accent);
  el.style.setProperty("--gpw-ink", surface.ink);
  el.style.setProperty("--gpw-muted", surface.muted);
}

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

function WeekDayHeader({ arg, jobs }: { arg: DayHeaderContentArg; jobs: Job[] }) {
  const dayJobs = jobsBetween(jobs, arg.date, arg.date);
  const total = bookedTotal(dayJobs);
  const signal = yearDaySignal(dayJobs);
  return (
    <div className="flex flex-col items-center px-1 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {format(arg.date, "EEE")}
      </span>
      <span
        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
          arg.isToday ? "bg-brand-blue text-white" : "text-brand-black"
        }`}
      >
        {format(arg.date, "d")}
      </span>
      <span
        className="mt-1 h-4 text-[11px] font-semibold tabular-nums"
        style={{ color: signal ? STATUS_SURFACE[signal].muted : undefined }}
      >
        {total > 0 ? formatCurrency(total) : ""}
      </span>
    </div>
  );
}

export default function JobCalendar() {
  const isMobile = useIsMobile();
  const { openNewJob } = useJobModals();
  const { jobs, jobsLoading: loading } = useAppData();
  const calendarRef = useRef<FullCalendar>(null);
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
    if (currentView !== "timeGridWeek") return;
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (!isSameDay(api.getDate(), cursor)) api.gotoDate(cursor);
  }, [currentView, cursor]);

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
      if (currentView === "timeGridWeek") {
        const api = calendarRef.current?.getApi();
        if (direction < 0) api?.prev();
        else api?.next();
        return;
      }
      setCursor((current) => {
        if (currentView === "dayGridMonth") return addMonths(current, direction);
        if (currentView === "multiMonthYear") return addYears(current, direction);
        return addDays(current, direction);
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentView, modalOpen, daySheetOpen]);

  const events = jobs.map((job) => {
    const event = jobToCalendarEvent(job);
    const surface = STATUS_SURFACE[job.status] ?? STATUS_SURFACE.Scheduled;
    return {
      ...event,
      title: getJobHouseholdTitle(job, jobs),
      backgroundColor: surface.bg,
      borderColor: surface.border,
      extendedProps: { job },
    };
  });

  function handleEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    const job = jobs.find((item) => item._id === info.event.id);
    if (job) openJob(job);
  }

  function handleDateSelect(info: DateSelectArg) {
    if (info.view.type !== "timeGridWeek") return;
    calendarRef.current?.getApi().unselect();
    openNewJobModal(format(info.start, "yyyy-MM-dd"), format(info.start, "HH:mm"), format(info.end, "HH:mm"));
  }

  function handleDateClick(info: DateClickArg) {
    if (info.view.type !== "timeGridWeek") return;
    const start = info.date;
    const end = new Date(start);
    end.setHours(end.getHours() + 2);
    openNewJobModal(format(start, "yyyy-MM-dd"), format(start, "HH:mm"), format(end, "HH:mm"));
  }

  function goToday() {
    const today = new Date();
    setCursor(today);
    if (currentView === "timeGridWeek") calendarRef.current?.getApi().today();
  }

  function shift(direction: number) {
    if (currentView === "timeGridWeek") {
      const api = calendarRef.current?.getApi();
      if (direction < 0) api?.prev();
      else api?.next();
      return;
    }
    setCursor((current) => {
      if (currentView === "dayGridMonth") return addMonths(current, direction);
      if (currentView === "multiMonthYear") return addYears(current, direction);
      return addDays(current, direction);
    });
  }

  function jumpToMonth(value: string) {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return;
    const day = Math.min(cursor.getDate(), new Date(year, month, 0).getDate());
    const next = new Date(year, month - 1, day);
    setCursor(next);
    if (currentView === "timeGridWeek") calendarRef.current?.getApi().gotoDate(next);
  }

  function jumpToDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return;
    setCursor(new Date(year, month - 1, day));
  }

  function handleDatesSet(info: DatesSetArg) {
    if (info.view.type !== "timeGridWeek") return;
    const next = info.view.calendar.getDate();
    setCursor((current) => (isSameDay(current, next) ? current : next));
  }

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const job = info.event.extendedProps.job as Job | undefined;
    paintJobEvent(info.el, job?.status);
    info.el.classList.add("gpw-week-job-event");
  }, []);

  function renderEventContent(arg: EventContentArg) {
    const job = arg.event.extendedProps.job as Job | undefined;
    if (!job) return null;
    const name = getJobHouseholdTitle(job, jobs);
    const services = jobServiceLabel(job);
    const town = jobTown(job);
    const mark = jobStatusMark(job);
    const price = job.finalPrice !== undefined ? formatCurrency(job.finalPrice) : "";
    return (
      <div className="gpw-week-card">
        <div className="gpw-week-name">{name}</div>
        {services ? <div className="gpw-week-services">{services}</div> : null}
        <div className="gpw-week-time">{formatTimeRange(job.startTime, job.endTime)}</div>
        {town ? <div className="gpw-week-line">{town}</div> : null}
        {price || mark ? (
          <div className="gpw-week-price">
            {price}
            {mark ? ` · ${mark.label}` : ""}
          </div>
        ) : null}
      </div>
    );
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
    <div className="flex h-full min-h-0 flex-col">
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
          <div className="calendar-container h-full min-h-0 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.06]">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              initialDate={cursor}
              headerToolbar={false}
              events={events}
              eventClick={handleEventClick}
              eventDidMount={handleEventDidMount}
              selectable
              selectMirror
              selectMinDistance={5}
              unselectAuto
              select={handleDateSelect}
              dateClick={handleDateClick}
              navLinks
              navLinkDayClick={(date) => {
                setCursor(date);
                setCurrentView("listDay");
              }}
              dayHeaderContent={(arg) => <WeekDayHeader arg={arg} jobs={jobs} />}
              slotMinTime="06:00:00"
              slotMaxTime="20:00:00"
              slotDuration="00:30:00"
              slotLabelInterval="01:00:00"
              scrollTime="07:00:00"
              allDaySlot={false}
              height="100%"
              expandRows
              nowIndicator
              stickyHeaderDates
              weekends
              slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
              eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
              timeZone="local"
              datesSet={handleDatesSet}
              eventContent={renderEventContent}
            />
          </div>
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
