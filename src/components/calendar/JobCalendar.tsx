"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventClickArg,
  DateSelectArg,
  EventContentArg,
  DatesSetArg,
  DayCellContentArg,
  DayCellMountArg,
  EventMountArg,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { Job } from "@/types";
import { STATUS_COLORS } from "@/lib/constants";
import {
  jobToCalendarEvent,
  formatCurrency,
  getCustomerName,
  getJobAddress,
  formatTime,
} from "@/lib/utils";
import { getJobDateOnly } from "@/lib/dates";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import MobileDaySheet from "@/components/calendar/MobileDaySheet";
import MobileCalendarView from "@/components/calendar/mobile/MobileCalendarView";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useJobModals } from "@/contexts/JobModalContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

/** Day = agenda list, Week = time grid, Month = month grid */
type CalendarView = "listDay" | "timeGridWeek" | "dayGridMonth";

const VIEW_BUTTONS: { view: CalendarView; label: string }[] = [
  { view: "listDay", label: "Day" },
  { view: "timeGridWeek", label: "Week" },
  { view: "dayGridMonth", label: "Month" },
];

const MONTH_JOB_EVENT_BG = "rgba(251, 146, 60, 0.45)";
const MONTH_JOB_EVENT_BORDER = "rgba(234, 88, 12, 0.6)";
const MONTH_JOB_EVENT_TEXT = "#7c2d12";

type MonthTitleArg = { date: { marker: Date } };

function abbreviatedMonthTitle(arg: MonthTitleArg) {
  return format(arg.date.marker, "MMM yyyy");
}

/** Abbreviated month on the 1st (e.g. "Jul 1"); day number only otherwise. */
function renderMonthDayCell(arg: DayCellContentArg) {
  const date = arg.date;
  if (arg.isMonthStart || date.getDate() === 1) {
    return format(date, "MMM d");
  }
  return format(date, "d");
}

function formatCalendarTitle(viewType: CalendarView, info: DatesSetArg) {
  const start = info.view.currentStart;
  if (viewType === "dayGridMonth") {
    return format(start, "MMM yyyy");
  }
  if (viewType === "listDay") {
    return format(start, "EEE, MMM d, yyyy");
  }
  if (viewType === "timeGridWeek") {
    const end = new Date(info.end);
    end.setMilliseconds(end.getMilliseconds() - 1);
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
  }
  return info.view.title;
}

function abbreviateMultiMonthTitles(container: Element | null) {
  if (!container) return;
  container.querySelectorAll<HTMLElement>(".fc-multimonth-month[data-date]").forEach((el) => {
    const iso = el.getAttribute("data-date");
    const titleEl = el.querySelector<HTMLElement>(".fc-multimonth-title");
    if (!iso || !titleEl) return;
    const [year, month] = iso.split("-").map(Number);
    titleEl.textContent = format(new Date(year, month - 1, 1), "MMM yyyy");
  });
}

export default function JobCalendar() {
  const isMobile = useIsMobile();
  const { openNewJob } = useJobModals();
  const { jobs, jobsLoading: loading } = useAppData();
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentView, setCurrentView] = useState<CalendarView>("dayGridMonth");
  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [monthPicker, setMonthPicker] = useState(format(new Date(), "yyyy-MM"));
  const touchStartX = useRef(0);
  const openDayViewRef = useRef<(date: Date) => void>(() => {});

  function openDayView(date: Date) {
    setDaySheetDate(date);
    setDaySheetOpen(true);
  }

  openDayViewRef.current = openDayView;

  const handleMonthDayCellDidMount = useCallback((arg: DayCellMountArg) => {
    if (arg.view.type !== "dayGridMonth") return;

    const frame = arg.el.querySelector(".fc-daygrid-day-frame") as HTMLElement | null;
    if (!frame) return;

    if (isMobile) {
      frame.classList.add("gpw-mobile-day-cell");

      if (!frame.dataset.gpwTapBound) {
        frame.dataset.gpwTapBound = "true";
        frame.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".fc-event") || target.closest(".fc-daygrid-more-link")) return;
          e.preventDefault();
          e.stopPropagation();
          openDayViewRef.current(arg.date);
        });
      }
      return;
    }

    if (frame.querySelector("[data-gpw-view-day]")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-gpw-view-day", "true");
    btn.className = "gpw-view-day-btn";
    btn.textContent = "View Day";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDayViewRef.current(arg.date);
    });
    frame.appendChild(btn);
  }, [isMobile]);

  const handleMonthDayCellWillUnmount = useCallback((arg: DayCellMountArg) => {
    arg.el.querySelector("[data-gpw-view-day]")?.remove();
    arg.el.querySelector("[data-gpw-job-count]")?.remove();
    const frame = arg.el.querySelector(".fc-daygrid-day-frame") as HTMLElement | null;
    if (frame) delete frame.dataset.gpwTapBound;
  }, []);

  const handleMonthEventDidMount = useCallback((info: EventMountArg) => {
    if (info.view.type !== "dayGridMonth") return;

    info.el.classList.add("gpw-month-job-event");
    if (isMobile) {
      info.el.classList.add("gpw-month-job-dot-event");
      const status = (info.event.extendedProps.job as Job | undefined)?.status;
      if (status) {
        info.el.style.backgroundColor = STATUS_COLORS[status];
        info.el.style.borderColor = STATUS_COLORS[status];
      }
      return;
    }

    info.el.style.backgroundColor = MONTH_JOB_EVENT_BG;
    info.el.style.borderColor = MONTH_JOB_EVENT_BORDER;
    info.el.style.borderWidth = "1px";
    info.el.style.borderStyle = "solid";
    info.el.style.color = MONTH_JOB_EVENT_TEXT;

    info.el.querySelectorAll<HTMLElement>(".fc-event-main, .fc-event-main-frame").forEach((el) => {
      el.style.color = MONTH_JOB_EVENT_TEXT;
    });
  }, [isMobile]);

  useEffect(() => {
    setSelectedJob((current) =>
      current ? jobs.find((job) => job._id === current._id) ?? current : null
    );
  }, [jobs]);

  useEffect(() => {
    if (currentView !== "dayGridMonth") return;
    const frame = requestAnimationFrame(() => {
      abbreviateMultiMonthTitles(calendarContainerRef.current);
      if (!isMobile) return;
      const container = calendarContainerRef.current;
      if (!container) return;
      container.querySelectorAll<HTMLElement>(".fc-daygrid-day[data-date]").forEach((cell) => {
        const iso = cell.getAttribute("data-date");
        if (!iso) return;
        const dayJobs = jobs.filter((job) => getJobDateOnly(job.jobDate) === iso);
        const top = cell.querySelector(".fc-daygrid-day-top");
        if (!top) return;
        let count = top.querySelector("[data-gpw-job-count]") as HTMLElement | null;
        if (dayJobs.length === 0) {
          count?.remove();
          return;
        }
        if (!count) {
          count = document.createElement("span");
          count.setAttribute("data-gpw-job-count", "true");
          count.className = "gpw-day-job-count";
          top.appendChild(count);
        }
        count.textContent = String(dayJobs.length);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [currentView, currentTitle, loading, jobs, isMobile]);

  const events = jobs.map((job) => {
    const event = jobToCalendarEvent(job);
    const address = getJobAddress(job);
    const services = job.services
      .map((s) => (s.name === "Other" && s.customServiceName ? s.customServiceName : s.name))
      .join(", ");

    return {
      ...event,
      title: [getCustomerName(job), address, services].filter(Boolean).join(" · "),
      backgroundColor: STATUS_COLORS[job.status],
      borderColor: STATUS_COLORS[job.status],
      extendedProps: { job, services, address },
    };
  });

  function handleEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    const job = jobs.find((j) => j._id === info.event.id);
    if (job) {
      setSelectedJob(job);
      setModalOpen(true);
    }
  }

  function openNewJobModal(jobDate: string, startTime: string, endTime: string) {
    openNewJob({ jobDate, startTime, endTime });
  }

  function handleDateSelect(info: DateSelectArg) {
    if (info.view.type !== "timeGridWeek") return;

    calendarRef.current?.getApi().unselect();

    openNewJobModal(
      format(info.start, "yyyy-MM-dd"),
      format(info.start, "HH:mm"),
      format(info.end, "HH:mm")
    );
  }

  function handleDateClick(info: DateClickArg) {
    if (info.view.type !== "timeGridWeek") return;

    const start = info.date;
    const end = new Date(start);
    end.setHours(end.getHours() + 2);
    openNewJobModal(format(start, "yyyy-MM-dd"), format(start, "HH:mm"), format(end, "HH:mm"));
  }

  function goToday() {
    calendarRef.current?.getApi().today();
  }

  function goPrev() {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view.type === "dayGridMonth") {
      api.incrementDate({ months: -1 });
    } else {
      api.prev();
    }
  }

  function goNext() {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view.type === "dayGridMonth") {
      api.incrementDate({ months: 1 });
    } else {
      api.next();
    }
  }

  function goToMonth(monthValue: string) {
    const [year, month] = monthValue.split("-").map(Number);
    calendarRef.current?.getApi().gotoDate(new Date(year, month - 1, 1));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (currentView !== "dayGridMonth") return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) < 60) return;
    if (diff > 0) goPrev();
    else goNext();
  }

  function changeView(view: CalendarView) {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  }

  function handleDatesSet(info: DatesSetArg) {
    const viewType = info.view.type as CalendarView;
    setCurrentTitle(formatCalendarTitle(viewType, info));
    setCurrentView(viewType);
    if (viewType === "dayGridMonth") {
      setMonthPicker(format(info.view.currentStart, "yyyy-MM"));
      requestAnimationFrame(() => {
        abbreviateMultiMonthTitles(calendarContainerRef.current);
      });
    }
  }

  function renderEventContent(arg: EventContentArg) {
    const job = arg.event.extendedProps.job as Job | undefined;
    if (!job) return null;

    const address = getJobAddress(job);
    const viewType = arg.view.type;
    const isList = viewType.startsWith("list");
    const isMonth = viewType === "dayGridMonth";

    if (isList) {
      return (
        <div className="flex w-full items-start gap-3 py-1">
          <div
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[job.status] }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-brand-black">{getCustomerName(job)}</p>
            {address && <p className="text-sm text-gray-600 mt-0.5">{address}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {formatTime(job.startTime)} – {formatTime(job.endTime)}
              {job.finalPrice !== undefined && ` · ${formatCurrency(job.finalPrice)}`}
              {job.paid && " · Paid"}
            </p>
          </div>
        </div>
      );
    }

    if (isMonth && isMobile) {
      return (
        <span
          className="gpw-job-dot"
          style={{ backgroundColor: STATUS_COLORS[job.status] }}
          title={getCustomerName(job)}
          aria-label={getCustomerName(job)}
        />
      );
    }

    if (isMonth) {
      return (
        <div className="fc-event-main-frame px-1 py-0.5 leading-tight overflow-hidden text-[#7c2d12]">
          <div className="font-semibold truncate text-[11px]">{getCustomerName(job)}</div>
        </div>
      );
    }

    return (
      <div className="fc-event-main-frame px-1 py-0.5 leading-tight overflow-hidden text-[#7c2d12]">
        <div className="font-semibold truncate text-[11px]">{getCustomerName(job)}</div>
        {address && <div className="truncate text-[10px] opacity-90">{address}</div>}
        <div className="truncate text-[10px] opacity-90">{arg.timeText}</div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileCalendarView jobs={jobs} loading={loading} />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className={`shrink-0 mb-2 ${isMobile ? "space-y-2" : "space-y-3 mb-3"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-brand-border bg-white overflow-hidden shrink-0">
            <button
              type="button"
              onClick={goPrev}
              className={`${isMobile ? "p-2.5" : "p-3"} active:bg-brand-gray transition-colors`}
              aria-label={currentView === "dayGridMonth" ? "Previous month" : "Previous"}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className={`${isMobile ? "px-3 py-2.5" : "px-4 py-3"} text-sm font-semibold border-x border-brand-border active:bg-brand-gray transition-colors`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={goNext}
              className={`${isMobile ? "p-2.5" : "p-3"} active:bg-brand-gray transition-colors`}
              aria-label={currentView === "dayGridMonth" ? "Next month" : "Next"}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {currentView === "dayGridMonth" && (
            <label className="relative inline-flex items-center rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm font-semibold text-brand-black shrink-0 cursor-pointer">
              <span>{format(new Date(`${monthPicker}-01`), "MMM yyyy")}</span>
              <input
                type="month"
                value={monthPicker}
                onChange={(e) => {
                  setMonthPicker(e.target.value);
                  goToMonth(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Jump to month"
              />
            </label>
          )}
        </div>

        {!(isMobile && currentView === "dayGridMonth") && (
          <h2 className="text-base md:text-xl font-bold text-brand-black leading-tight">
            {currentTitle}
          </h2>
        )}

        <div className={`grid grid-cols-3 gap-1.5 ${isMobile ? "" : ""}`}>
          {VIEW_BUTTONS.map(({ view, label }) => (
            <button
              key={view}
              type="button"
              onClick={() => changeView(view)}
              className={`rounded-xl text-sm font-semibold transition-colors ${
                isMobile ? "py-2.5" : "py-3"
              } ${
                currentView === view
                  ? "bg-brand-blue text-white"
                  : "bg-white text-gray-600 border border-brand-border active:bg-brand-gray"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {currentView === "listDay" && (
          <p className="text-xs text-center text-gray-500 bg-blue-50 rounded-lg py-2 px-3">
            Daily job list — use arrows to change days
          </p>
        )}

        {currentView === "dayGridMonth" && (
          <p className="text-xs text-center text-gray-500 bg-blue-50 rounded-lg py-1.5 px-3">
            {isMobile
              ? "Swipe for months · tap a day for details · dots = job status"
              : "Scroll through months · use View Day on a cell to see jobs or add one · tap a job for details"}
          </p>
        )}

        {currentView === "timeGridWeek" && (
          <p className="text-xs text-center text-gray-500 bg-blue-50 rounded-lg py-2 px-3">
            {isMobile
              ? "Tap a time slot or press and drag to schedule a job"
              : "Click or drag a time slot to schedule a job"}
          </p>
        )}
      </div>

      {!(isMobile && currentView === "dayGridMonth") && (
        <div className="flex flex-wrap gap-2 mb-2 shrink-0">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1 text-[10px] md:text-xs text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {status}
            </div>
          ))}
        </div>
      )}

      <div
        ref={calendarContainerRef}
        className={`flex-1 min-h-0 rounded-xl bg-white border border-brand-border shadow-sm overflow-hidden calendar-container relative ${
          isMobile ? "calendar-mobile" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading && jobs.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <LoadingSpinner />
          </div>
        )}

        <FullCalendar
          key={isMobile ? "cal-mobile" : "cal-desktop"}
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={events}
          eventClick={handleEventClick}
          eventDidMount={handleMonthEventDidMount}
          eventClassNames={(arg) =>
            arg.view.type === "dayGridMonth" ? ["gpw-month-job-event"] : []
          }
          selectable
          selectAllow={() => calendarRef.current?.getApi().view.type === "timeGridWeek"}
          selectMirror
          selectMinDistance={5}
          selectLongPressDelay={isMobile ? 400 : 0}
          unselectAuto
          select={handleDateSelect}
          dateClick={handleDateClick}
          multiMonthTitleFormat={abbreviatedMonthTitle}
          views={{
            dayGridMonth: {
              type: "multiMonth",
              duration: { months: isMobile ? 1 : 12 },
              multiMonthMaxColumns: 1,
              multiMonthMinWidth: isMobile ? 280 : 320,
              multiMonthTitleFormat: abbreviatedMonthTitle,
              dayCellContent: renderMonthDayCell,
              dayCellDidMount: handleMonthDayCellDidMount,
              dayCellWillUnmount: handleMonthDayCellWillUnmount,
              dayHeaderFormat: { weekday: "narrow" },
              fixedWeekCount: isMobile,
              showNonCurrentDates: true,
            },
            timeGridWeek: {
              dayHeaderFormat: { weekday: "short", day: "numeric" },
            },
            listDay: {
              listDayFormat: { weekday: "short", month: "short", day: "numeric" },
            },
          }}
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
          dayMaxEvents={isMobile ? 3 : 3}
          dayMaxEventRows={isMobile ? 1 : undefined}
          moreLinkClick="popover"
          listDayFormat={{ weekday: "short", month: "short", day: "numeric" }}
          listDaySideFormat={false}
          noEventsContent="No jobs scheduled"
          weekends
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          timeZone="local"
          datesSet={handleDatesSet}
          eventContent={renderEventContent}
        />
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
          setSelectedJob(job);
          setModalOpen(true);
        }}
        onAddJob={(jobDate, startTime, endTime) => {
          setDaySheetOpen(false);
          openNewJobModal(jobDate, startTime, endTime);
        }}
      />
    </div>
  );
}
