"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CalendarDays,
  Plus,
} from "lucide-react";
import type { Job } from "@/types";
import { STATUS_COLORS } from "@/lib/constants";
import { getJobDateOnly } from "@/lib/dates";
import {
  formatCompactCurrency,
  formatDurationShort,
  formatJobDurationEst,
  getDayRevenue,
  getDayTotalMinutes,
  getJobsForDate,
  getJobServiceEntries,
  getJobCellLabel,
} from "@/lib/calendar-mobile";
import {
  formatCurrency,
  formatTime,
  getCustomerName,
  getJobAddress,
} from "@/lib/utils";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileMenu from "@/components/layout/MobileMenu";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ServicePill from "@/components/calendar/ServicePill";
import { useJobModals } from "@/contexts/JobModalContext";
import { usePathname } from "next/navigation";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PANEL_COLLAPSED_HEIGHT = 220;

function getExpandedPanelHeight(containerHeight: number) {
  return Math.max(PANEL_COLLAPSED_HEIGHT, Math.round(containerHeight * 0.72));
}

interface MobileCalendarViewProps {
  jobs: Job[];
  loading: boolean;
  onRefresh: () => void;
}

export default function MobileCalendarView({ jobs, loading, onRefresh }: MobileCalendarViewProps) {
  const pathname = usePathname();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(PANEL_COLLAPSED_HEIGHT);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const touchStartX = useRef(0);
  const calendarAreaRef = useRef<HTMLDivElement>(null);
  const isDraggingPanelRef = useRef(false);
  const panelDragRef = useRef({ startY: 0, startHeight: PANEL_COLLAPSED_HEIGHT, moved: false });

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
    const handler = () => onRefresh();
    window.addEventListener("gpw:job-saved", handler);
    return () => window.removeEventListener("gpw:job-saved", handler);
  }, [onRefresh]);

  function goToday() {
    const today = new Date();
    setMonth(startOfMonth(today));
    setSelectedDate(today);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) < 60) return;
    if (diff > 0) setMonth((m) => subMonths(m, 1));
    else setMonth((m) => addMonths(m, 1));
  }

  const snapPanelHeight = useCallback((height: number) => {
    const container = calendarAreaRef.current;
    if (!container) return PANEL_COLLAPSED_HEIGHT;
    const expanded = getExpandedPanelHeight(container.clientHeight);
    const mid = (PANEL_COLLAPSED_HEIGHT + expanded) / 2;
    return height >= mid ? expanded : PANEL_COLLAPSED_HEIGHT;
  }, []);

  const togglePanelHeight = useCallback(() => {
    const container = calendarAreaRef.current;
    if (!container) return;
    const expanded = getExpandedPanelHeight(container.clientHeight);
    setPanelHeight((h) => (h < (PANEL_COLLAPSED_HEIGHT + expanded) / 2 ? expanded : PANEL_COLLAPSED_HEIGHT));
  }, []);

  function handlePanelPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingPanelRef.current = true;
    panelDragRef.current = {
      startY: e.clientY,
      startHeight: panelHeight,
      moved: false,
    };
    setIsDraggingPanel(true);
  }

  function handlePanelPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingPanelRef.current) return;
    const { startY, startHeight } = panelDragRef.current;
    const deltaY = startY - e.clientY;
    if (Math.abs(deltaY) > 6) panelDragRef.current.moved = true;

    const container = calendarAreaRef.current;
    if (!container) return;
    const max = getExpandedPanelHeight(container.clientHeight);
    const next = Math.min(max, Math.max(PANEL_COLLAPSED_HEIGHT, startHeight + deltaY));
    setPanelHeight(next);
  }

  function handlePanelPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingPanelRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDraggingPanelRef.current = false;
    setIsDraggingPanel(false);
    if (panelDragRef.current.moved) {
      setPanelHeight((h) => snapPanelHeight(h));
    } else {
      togglePanelHeight();
    }
  }

  function handlePanelPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingPanelRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDraggingPanelRef.current = false;
    setIsDraggingPanel(false);
    setPanelHeight((h) => snapPanelHeight(h));
  }

  const containerHeight = calendarAreaRef.current?.clientHeight ?? 0;
  const expandedPanelHeight = containerHeight
    ? getExpandedPanelHeight(containerHeight)
    : PANEL_COLLAPSED_HEIGHT + 200;
  const isPanelExpanded =
    panelHeight >= (PANEL_COLLAPSED_HEIGHT + expandedPanelHeight) / 2;

  return (
    <div className="flex flex-col h-full min-h-0 bg-brand-gray -m-3">
      <MobileHeader onMenuOpen={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} currentPath={pathname} />

      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-brand-border">
        <div className="flex items-center rounded-lg border border-brand-border overflow-hidden">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="p-2 active:bg-brand-gray"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-2 text-xs font-semibold border-x border-brand-border active:bg-brand-gray"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-2 active:bg-brand-gray"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm font-bold text-brand-black">{format(month, "MMMM yyyy")}</p>
      </div>

      <div
        ref={calendarAreaRef}
        className="flex-1 flex flex-col min-h-0 bg-white relative"
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <LoadingSpinner />
          </div>
        )}

        <div
          className="flex-1 min-h-0 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
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
                onClick={() => setSelectedDate(day)}
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
          className="shrink-0 flex flex-col border-t-2 border-brand-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
          style={{
            height: panelHeight,
            transition: isDraggingPanel ? "none" : "height 0.25s ease-out",
          }}
          aria-expanded={isPanelExpanded}
        >
          <div
            role="separator"
            aria-label="Drag to resize day details"
            className="shrink-0 flex flex-col items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none select-none"
            onPointerDown={handlePanelPointerDown}
            onPointerMove={handlePanelPointerMove}
            onPointerUp={handlePanelPointerUp}
            onPointerCancel={handlePanelPointerCancel}
          >
            <div className="h-1 w-12 rounded-full bg-gray-400" />
            <p className="mt-1 text-[10px] font-medium text-gray-400">
              {isPanelExpanded ? "Drag down to collapse" : "Drag up for more"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pb-2 border-b border-brand-border">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
              <h3 className="text-sm font-bold text-brand-black truncate">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                openNewJob({
                  jobDate: selectedDateStr,
                  startTime: "08:00",
                  endTime: "12:00",
                })
              }
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

          <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 min-h-0">
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
          </div>
        </div>
      </div>

      <JobDetailsModal
        job={selectedJob}
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        onUpdated={onRefresh}
      />
    </div>
  );
}
