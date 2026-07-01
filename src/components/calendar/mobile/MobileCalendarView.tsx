"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as RowChevron,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  Plus,
} from "lucide-react";
import type { Job } from "@/types";
import { STATUS_COLORS } from "@/lib/constants";
import {
  formatCompactCurrency,
  formatDurationShort,
  formatJobDurationEst,
  getDayRevenue,
  getDayTotalMinutes,
  getJobsForDate,
  getJobServiceEntries,
  getJobCellLabel,
  getNewJobTimePrefill,
} from "@/lib/calendar-mobile";
import {
  formatCurrency,
  formatTime,
  getCustomerName,
  getJobAddress,
} from "@/lib/utils";
import MobileHeader from "@/components/layout/MobileHeader";
import DataSyncIndicator from "@/components/layout/DataSyncIndicator";
import MobileMenu from "@/components/layout/MobileMenu";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ServicePill from "@/components/calendar/ServicePill";
import { useJobModals } from "@/contexts/JobModalContext";
import { usePathname } from "next/navigation";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DayPanelSize = "collapsed" | "default" | "expanded" | "full";

const DAY_PANEL_ORDER: DayPanelSize[] = ["collapsed", "default", "expanded", "full"];

const CALENDAR_FLEX: Record<DayPanelSize, string> = {
  collapsed: "flex-[1.35] min-h-[100px]",
  default: "flex-[1.05] min-h-[100px]",
  expanded: "flex-[0.3] min-h-[56px]",
  full: "flex-[0.12] min-h-[44px]",
};

const DAY_PANEL_FLEX: Record<DayPanelSize, string> = {
  collapsed: "flex-[0.8] min-h-[180px]",
  default: "flex-1 min-h-[200px]",
  expanded: "flex-[2] min-h-[300px]",
  full: "flex-[3] min-h-[360px]",
};

const PACKED_DAY_JOB_COUNT = 3;

interface MobileCalendarViewProps {
  jobs: Job[];
  loading: boolean;
}

export default function MobileCalendarView({ jobs, loading }: MobileCalendarViewProps) {
  const pathname = usePathname();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [dayPanelSize, setDayPanelSize] = useState<DayPanelSize>("default");
  const jobListRef = useRef<HTMLDivElement>(null);
  const handleDragRef = useRef({ startY: 0, moved: false });

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedDayJobs = useMemo(
    () => getJobsForDate(jobs, selectedDateStr),
    [jobs, selectedDateStr]
  );
  const selectedRevenue = getDayRevenue(selectedDayJobs);
  const selectedMinutes = getDayTotalMinutes(selectedDayJobs);
  const { openNewJob } = useJobModals();

  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    };
    window.addEventListener("gpw:job-saved", handler);
    return () => window.removeEventListener("gpw:job-saved", handler);
  }, []);

  useEffect(() => {
    jobListRef.current?.scrollTo({ top: 0 });
  }, [selectedDateStr]);

  function selectDate(day: Date) {
    if (!isSameMonth(day, month)) {
      setMonth(startOfMonth(day));
    }
    setSelectedDate(day);
    const count = getJobsForDate(jobs, format(day, "yyyy-MM-dd")).length;
    if (count >= 5) setDayPanelSize("full");
    else if (count >= PACKED_DAY_JOB_COUNT) setDayPanelSize("expanded");
  }

  function stepDayPanel(direction: "up" | "down") {
    setDayPanelSize((current) => {
      const index = DAY_PANEL_ORDER.indexOf(current);
      if (direction === "up") {
        return DAY_PANEL_ORDER[Math.min(index + 1, DAY_PANEL_ORDER.length - 1)];
      }
      return DAY_PANEL_ORDER[Math.max(index - 1, 0)];
    });
  }

  function toggleDayPanelExpanded() {
    setDayPanelSize((size) => {
      if (size === "full" || size === "expanded") return "default";
      if (size === "collapsed") return "expanded";
      return "expanded";
    });
  }

  function resizeHandleLabel() {
    if (dayPanelSize === "full") {
      return { icon: ChevronDown, text: "Show less" };
    }
    if (dayPanelSize === "expanded") {
      return { icon: ChevronUp, text: "Drag up for max" };
    }
    if (dayPanelSize === "collapsed") {
      return { icon: ChevronUp, text: "Drag up for more" };
    }
    return { icon: ChevronUp, text: "Drag up to expand" };
  }

  const handleLabel = resizeHandleLabel();
  const HandleIcon = handleLabel.icon;

  function handleResizePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleDragRef.current = { startY: e.clientY, moved: false };
  }

  function handleResizePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const delta = handleDragRef.current.startY - e.clientY;
    if (Math.abs(delta) > 8) handleDragRef.current.moved = true;
  }

  function handleResizePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const delta = handleDragRef.current.startY - e.clientY;
    if (!handleDragRef.current.moved) {
      toggleDayPanelExpanded();
      return;
    }
    if (delta > 36) stepDayPanel("up");
    else if (delta < -36) stepDayPanel("down");
  }

  function goToday() {
    const today = new Date();
    setMonth(startOfMonth(today));
    setSelectedDate(today);
  }

  function goPrevMonth() {
    setMonth((m) => subMonths(m, 1));
  }

  function goNextMonth() {
    setMonth((m) => addMonths(m, 1));
  }

  const isCurrentMonth = isSameMonth(month, new Date());

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-brand-gray">
      <MobileHeader onMenuOpen={() => setMenuOpen(true)} />
      <DataSyncIndicator />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} currentPath={pathname} />

      <div className="sticky top-0 z-20 shrink-0 border-b border-brand-border bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-gray/40 active:bg-brand-gray"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" strokeWidth={2.5} />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="text-base font-bold text-brand-black">{format(month, "MMMM yyyy")}</p>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToday}
                className="mt-0.5 text-xs font-semibold text-brand-blue active:opacity-70"
              >
                Jump to today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goNextMonth}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-gray/40 active:bg-brand-gray"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-brand-black" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white relative">
        {loading && jobs.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <LoadingSpinner />
          </div>
        )}

        <div
          className={`${CALENDAR_FLEX[dayPanelSize]} overflow-y-auto overscroll-contain`}
        >
        <div className="shrink-0 grid grid-cols-7 border-b border-brand-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1.5 text-center text-[10px] font-semibold text-gray-400 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="shrink-0 grid grid-cols-7 auto-rows-fr border-l border-brand-border">
          {calendarDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayJobs = getJobsForDate(jobs, dateStr);
            const inMonth = isSameMonth(day, month);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const revenue = getDayRevenue(dayJobs);
            const primaryStatus = dayJobs[0]?.status;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => selectDate(day)}
                className={`min-h-[72px] border-r border-b border-brand-border p-1 text-left flex flex-col ${
                  selected
                    ? "bg-brand-blue text-white"
                    : inMonth
                      ? "bg-white text-brand-black"
                      : "bg-gray-50/80 text-gray-400"
                }`}
              >
                <div className="flex items-start justify-between gap-0.5">
                  <span
                    className={`text-[11px] font-bold leading-none ${
                      today && !selected ? "text-brand-blue" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {dayJobs.length > 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-[8px] font-medium leading-none ${
                        selected ? "text-white/90" : "text-gray-500"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: primaryStatus
                            ? STATUS_COLORS[primaryStatus]
                            : "#9ca3af",
                        }}
                      />
                      {dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-0.5 mt-0.5 min-h-0 overflow-y-auto">
                  {dayJobs.map((job) => (
                    <div
                      key={job._id}
                      className="flex items-center gap-0.5 min-w-0"
                      title={getJobCellLabel(job)}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[job.status] }}
                      />
                      <span
                        className={`truncate text-[7px] font-semibold leading-tight ${
                          selected ? "text-white" : "text-brand-black"
                        }`}
                      >
                        {getJobCellLabel(job)}
                      </span>
                    </div>
                  ))}
                </div>

                {revenue > 0 && (
                  <div
                    className={`mt-auto pt-0.5 text-[8px] font-medium leading-none ${
                      selected ? "text-white/90" : "text-gray-500"
                    }`}
                  >
                    {formatCompactCurrency(revenue)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        </div>

        <div
          className={`${DAY_PANEL_FLEX[dayPanelSize]} flex flex-col min-h-0 border-t-2 border-brand-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)] overflow-hidden`}
        >
          <button
            type="button"
            aria-label={
              dayPanelSize === "full" || dayPanelSize === "expanded"
                ? "Shrink day details"
                : "Expand day details"
            }
            className="shrink-0 flex flex-col items-center justify-center py-2.5 w-full touch-none select-none active:bg-brand-gray/60"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
          >
            <div className="h-1 w-12 rounded-full bg-gray-400" />
            <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-gray-400">
              <HandleIcon className="h-3 w-3" />
              {handleLabel.text}
            </span>
          </button>

          <div className="flex items-center justify-between gap-2 px-4 pb-2 border-b border-brand-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
              <h3 className="text-sm font-bold text-brand-black truncate">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                const { startTime, endTime } = getNewJobTimePrefill(jobs, selectedDateStr);
                openNewJob({ jobDate: selectedDateStr, startTime, endTime });
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-red px-2.5 py-1.5 text-xs font-semibold text-white active:bg-red-700"
              aria-label={`Add job on ${format(selectedDate, "MMM d")}`}
            >
              <Plus className="h-4 w-4" />
              Add Job
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 px-3 py-2 shrink-0">
            {[
              { label: "Jobs", value: `${selectedDayJobs.length} Job${selectedDayJobs.length !== 1 ? "s" : ""}` },
              {
                label: "Revenue",
                value: `${formatCompactCurrency(selectedRevenue)} Est.`,
              },
              {
                label: "Time",
                value: selectedMinutes > 0 ? formatDurationShort(selectedMinutes) : "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-brand-border bg-brand-gray/50 px-1.5 py-2 text-center"
              >
                <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-[10px] font-bold text-brand-black mt-0.5 leading-tight">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div
            ref={jobListRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-3 space-y-2"
          >
            {selectedDayJobs.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-6">No jobs scheduled this day.</p>
            ) : (
              selectedDayJobs.map((job) => {
                const serviceEntries = getJobServiceEntries(job);
                const address = getJobAddress(job);
                return (
                  <button
                    key={job._id}
                    type="button"
                    onClick={() => {
                      setSelectedJob(job);
                      setJobModalOpen(true);
                    }}
                    className="w-full flex items-stretch gap-2 rounded-xl border border-brand-border p-3 text-left active:bg-brand-gray"
                  >
                    <div className="shrink-0 w-16 text-[10px] font-semibold text-gray-600 leading-snug">
                      <div>{formatTime(job.startTime)}</div>
                      <div className="text-gray-400">–</div>
                      <div>{formatTime(job.endTime)}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-brand-black truncate">
                        {getCustomerName(job)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {serviceEntries.length > 0 ? (
                          serviceEntries.map(({ label, serviceName }, index) => (
                            <ServicePill
                              key={`${job._id}-service-${index}`}
                              serviceName={serviceName}
                              label={label}
                              size="sm"
                            />
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No services</span>
                        )}
                      </div>
                      {address && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{address}</p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end justify-between gap-1">
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium"
                        style={{ color: STATUS_COLORS[job.status] }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[job.status] }}
                        />
                        {job.status}
                      </span>
                      {job.finalPrice !== undefined && (
                        <span className="text-xs font-bold text-brand-black">
                          {formatCurrency(job.finalPrice)}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatJobDurationEst(job.startTime, job.endTime)}
                      </span>
                      <RowChevron className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                );
              })
            )}
            {selectedDayJobs.length > 0 && (
              <div
                aria-hidden
                className="w-full min-h-[6rem] shrink-0 rounded-xl border border-transparent pointer-events-none"
              />
            )}
          </div>
        </div>
      </div>

      <JobDetailsModal
        job={selectedJob}
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        onUpdated={() => {
          setSelectedJob((current) =>
            current ? jobs.find((job) => job._id === current._id) ?? null : null
          );
        }}
      />
    </div>
  );
}
