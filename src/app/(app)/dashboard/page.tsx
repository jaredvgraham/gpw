"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { addDays, endOfMonth, endOfYear, format, startOfMonth, startOfYear } from "date-fns";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RevenueBarChart from "@/components/dashboard/RevenueBarChart";
import HorizontalBarList from "@/components/dashboard/HorizontalBarList";
import TopCustomersList from "@/components/dashboard/TopCustomersList";
import QuarterlyChart from "@/components/dashboard/QuarterlyChart";
import InsightsBreadcrumb from "@/components/dashboard/InsightsBreadcrumb";
import GrossNetSection from "@/components/dashboard/GrossNetSection";
import OwnerBoard from "@/components/dashboard/OwnerBoard";
import {
  MonthNavigator,
  PeriodViewToggle,
  RangePicker,
  WeekNavigator,
  YearSelector,
  type PeriodView,
} from "@/components/dashboard/PeriodNav";
import { formatCurrency } from "@/lib/utils";
import {
  calendarWeekRange,
  computeBusinessInsights,
  computePeriodProfit,
  computeRangeInsights,
  type RevenuePoint,
} from "@/lib/dashboard-stats";
import { STATUS_COLORS } from "@/lib/constants";
import { useAppData } from "@/contexts/AppDataContext";
import { getJobDateOnly } from "@/lib/dates";
import { computeOwnerSnapshot } from "@/lib/owner-metrics";
import type { Expense, Lead } from "@/types";

type ReportLens = "money" | "sources" | "jobs";

const REPORT_LENSES: { id: ReportLens; label: string }[] = [
  { id: "money", label: "Finances" },
  { id: "sources", label: "Sources" },
  { id: "jobs", label: "Jobs" },
];

export default function DashboardPage() {
  const { jobs, jobsLoading } = useAppData();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = format(now, "yyyy-MM-dd");

  const [view, setView] = useState<PeriodView>("year");
  const [lens, setLens] = useState<ReportLens>("money");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => calendarWeekRange(today).start);
  const [rangeStart, setRangeStart] = useState(() => format(startOfMonth(now), "yyyy-MM-dd"));
  const [rangeEnd, setRangeEnd] = useState(() => format(endOfMonth(now), "yyyy-MM-dd"));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesReady, setExpensesReady] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsReady, setLeadsReady] = useState(false);

  const insights = useMemo(
    () =>
      computeBusinessInsights(jobs, {
        year: selectedYear,
        month: selectedMonth,
        weekStart: selectedWeekStart,
      }),
    [jobs, selectedYear, selectedMonth, selectedWeekStart]
  );

  const range = useMemo(
    () => computeRangeInsights(jobs, rangeStart, rangeEnd),
    [jobs, rangeStart, rangeEnd]
  );

  const profitRange = useMemo(() => {
    if (view === "week") return { from: insights.week.weekStart, to: insights.week.weekEnd };
    if (view === "month") {
      const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
      return {
        from: format(startOfMonth(monthDate), "yyyy-MM-dd"),
        to: format(endOfMonth(monthDate), "yyyy-MM-dd"),
      };
    }
    if (view === "range") return { from: range.start, to: range.end };
    const yearDate = new Date(selectedYear, 0, 1);
    return {
      from: format(startOfYear(yearDate), "yyyy-MM-dd"),
      to: format(endOfYear(yearDate), "yyyy-MM-dd"),
    };
  }, [
    view,
    selectedYear,
    selectedMonth,
    insights.week.weekStart,
    insights.week.weekEnd,
    range.start,
    range.end,
  ]);

  const profit = useMemo(
    () => computePeriodProfit(jobs, expenses, profitRange.from, profitRange.to),
    [jobs, expenses, profitRange]
  );

  const ownerSnapshot = useMemo(
    () =>
      expensesReady && leadsReady
        ? computeOwnerSnapshot(jobs, leads, expenses, profitRange.from, profitRange.to)
        : null,
    [jobs, leads, expenses, expensesReady, leadsReady, profitRange]
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/expenses")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load expenses");
        return response.json() as Promise<Expense[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setExpenses(data);
        setExpensesReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setExpensesReady(true);
      });

    fetch("/api/leads")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load leads");
        return response.json() as Promise<Lead[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setLeads(Array.isArray(data) ? data : []);
        setLeadsReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLeadsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { month, week, year } = insights;

  const workDays = useMemo(() => {
    const start = profitRange.from <= profitRange.to ? profitRange.from : profitRange.to;
    const end = profitRange.from <= profitRange.to ? profitRange.to : profitRange.from;
    const days = new Set<string>();
    for (const job of jobs) {
      if (job.status === "Cancelled") continue;
      const date = getJobDateOnly(job.jobDate);
      if (date >= start && date <= end) days.add(date);
    }
    return days.size;
  }, [jobs, profitRange]);
  const dailyStats =
    expensesReady && workDays > 0
      ? [
          { value: formatCurrency(profit.gross / workDays), label: "gross / work day" },
          { value: formatCurrency(profit.net / workDays), label: "net / work day" },
        ]
      : [];

  const statement =
    view === "week"
      ? {
          label: week.label,
          collected: week.collected,
          outstanding: week.outstanding,
          stats: [
            { value: String(week.jobsTotal), label: "jobs" },
            { value: String(week.completed), label: "done" },
            { value: String(week.scheduled), label: "scheduled" },
            { value: formatCurrency(week.averageJobValue), label: "average" },
            week.cancelled > 0 ? { value: String(week.cancelled), label: "cancelled" } : null,
          ].filter((stat): stat is { value: string; label: string } => Boolean(stat)),
        }
      : view === "month"
        ? {
            label: month.label,
            collected: month.collected,
            outstanding: month.outstanding,
            stats: [
              { value: String(month.jobsTotal), label: "jobs" },
              { value: String(month.completed), label: "done" },
              { value: String(month.scheduled), label: "scheduled" },
              { value: formatCurrency(month.averageCompletedJobValue), label: "per done job" },
              { value: formatCurrency(month.pipeline), label: "to do" },
            ],
          }
        : view === "range"
          ? {
              label: range.label,
              collected: range.collected,
              outstanding: range.outstanding,
              stats: [
                { value: String(range.jobsTotal), label: "jobs" },
                { value: String(range.uniqueCustomers), label: "customers" },
                { value: formatCurrency(range.averageJobValue), label: "average" },
                range.cancelled > 0 ? { value: String(range.cancelled), label: "cancelled" } : null,
              ].filter((stat): stat is { value: string; label: string } => Boolean(stat)),
            }
          : {
              label: String(selectedYear),
              collected: year.revenueCollected,
              outstanding: year.revenueOutstanding,
              stats: [
                { value: String(year.jobsTotal), label: "jobs" },
                { value: String(year.jobsCompleted), label: "done" },
                { value: formatCurrency(year.averageJobValue), label: "average" },
                { value: String(year.uniqueCustomers), label: "customers" },
                year.yearOverYearChange !== null
                  ? {
                      value: `${year.yearOverYearChange >= 0 ? "+" : ""}${year.yearOverYearChange.toFixed(1)}%`,
                      label: `vs ${year.year - 1}`,
                    }
                  : null,
                year.bestMonth
                  ? {
                      value: formatCurrency(year.bestMonth.revenue),
                      label: `best · ${year.bestMonth.label}`,
                    }
                  : null,
              ].filter((stat): stat is { value: string; label: string } => Boolean(stat)),
            };

  const periodServices =
    view === "week"
      ? week.topServices
      : view === "month"
        ? month.topServices
        : view === "range"
          ? range.topServices
          : year.topServices;
  const periodServiceScale =
    view === "week"
      ? week.revenue
      : view === "month"
        ? month.revenue
        : view === "range"
          ? range.revenue
          : year.revenueTotal;
  const periodCustomers = view === "year" ? year.topCustomers : view === "range" ? range.topCustomers : null;
  const periodStatus =
    view === "week"
      ? week.statusCounts
      : view === "month"
        ? month.statusCounts
        : view === "range"
          ? range.statusCounts
          : year.statusCounts;
  const chartTitle =
    view === "week"
      ? "Daily revenue"
      : view === "month"
        ? "Weekly revenue"
        : view === "range"
          ? range.bucketDescription
          : "Monthly revenue";

  const handleMonthChange = (yr: number, mo: number) => {
    setSelectedYear(yr);
    setSelectedMonth(mo);
  };

  const handleWeekChange = (anchor: string) => {
    const { start } = calendarWeekRange(anchor);
    setSelectedWeekStart(start);
    const midweek = addDays(new Date(`${start}T12:00:00`), 3);
    setSelectedYear(midweek.getFullYear());
    setSelectedMonth(midweek.getMonth() + 1);
  };

  const handleBreadcrumbNavigate = (target: PeriodView) => {
    setView(target);
    if (target === "year") return;
    if (target === "month") {
      setSelectedYear(selectedYear);
      setSelectedMonth(selectedMonth);
    }
  };

  const drillToMonth = (point: RevenuePoint) => {
    const yr = Number(point.key.slice(0, 4));
    const mo = Number(point.key.slice(5, 7));
    setSelectedYear(yr);
    setSelectedMonth(mo);
    setView("month");
  };

  const drillToWeek = (point: RevenuePoint) => {
    handleWeekChange(point.startDate);
    setView("week");
  };

  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const currentWeekKey = calendarWeekRange(today).start;

  if (jobsLoading && jobs.length === 0) return <LoadingSpinner />;

  return (
    <div className="phone-nav-inset flex min-w-0 flex-col md:min-h-0 md:flex-1 md:overflow-hidden">
      <div className="max-md:contents md:mb-6 md:shrink-0 md:space-y-3 md:border-b md:border-black/6 md:pb-4">
        <div
          className="sticky top-0 z-20 mb-3 grid grid-cols-3 gap-1 border-b border-black/6 bg-white px-4 py-2 md:static md:mb-0 md:flex md:items-center md:gap-2 md:border-0 md:bg-transparent md:px-0 md:py-0"
          role="tablist"
          aria-label="Report"
        >
          {REPORT_LENSES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={lens === item.id}
              onClick={() => setLens(item.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                lens === item.id
                  ? "bg-brand-black text-white"
                  : "text-gray-500 hover:text-brand-black"
              }`}
            >
              {item.label}
            </button>
          ))}
          <Link
            href="/simulation"
            className="col-span-3 mt-1 justify-self-center py-1 text-[13px] text-gray-500 transition-colors hover:text-gray-950 md:col-auto md:ml-4 md:mt-0 md:justify-self-auto"
          >
            Simulation <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="mb-6 flex flex-col gap-3 px-4 sm:flex-row sm:flex-wrap sm:items-center md:mb-0 md:px-0">
          <InsightsBreadcrumb
            view={view}
            year={selectedYear}
            month={selectedMonth}
            weekLabel={week.label}
            rangeLabel={range.label}
            onNavigate={handleBreadcrumbNavigate}
          />
          <PeriodViewToggle value={view} onChange={setView} />
          {view === "year" && (
            <YearSelector
              years={insights.availableYears}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          )}
          {view === "month" && (
            <MonthNavigator year={selectedYear} month={selectedMonth} onChange={handleMonthChange} />
          )}
          {view === "week" && (
            <WeekNavigator weekStart={selectedWeekStart} onChange={handleWeekChange} />
          )}
          {view === "range" && (
            <RangePicker start={rangeStart} end={rangeEnd} onChange={(start, end) => {
              setRangeStart(start);
              setRangeEnd(end);
            }} />
          )}
        </div>
      </div>

      <div className="min-w-0 px-4 md:min-h-0 md:flex-1 md:overflow-x-hidden md:overflow-y-auto md:px-0">
        {lens === "money" && (
          <div className="grid min-w-0 items-start gap-10 lg:grid-cols-2">
            <div className="min-w-0">
              <GrossNetSection
                label={statement.label}
                gross={profit.gross}
                expenses={profit.expensesTotal}
                net={profit.net}
                expensesReady={expensesReady}
                collected={statement.collected}
                outstanding={statement.outstanding}
                slices={ownerSnapshot?.expensesByType}
                stats={[...dailyStats, ...statement.stats]}
              />
              <div className="mt-3">
                <OwnerBoard part="money" snapshot={ownerSnapshot} leadsReady={leadsReady} />
              </div>
              <Link
                href="/simulation"
                className="group mt-10 block border border-black/8 bg-[#f1ebe0] px-5 py-5 transition-colors hover:border-black/20"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-black/40">Laboratory</p>
                  <span className="text-sm text-black/45 transition-colors group-hover:text-black">Open →</span>
                </div>
                <p className="mt-2 font-serif text-[1.65rem] leading-none tracking-tight text-[#1c1915]">Simulation</p>
                <p className="mt-2 max-w-[42ch] text-sm leading-snug text-black/55">
                  A living model of the business. Turn a valve, watch profit move.
                </p>
              </Link>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-gray-500">{chartTitle}</h2>
              <div className="mt-4">
                {view === "year" && (
                  <RevenueBarChart
                    data={year.monthlyRevenue}
                    highlightKey={selectedYear === currentYear ? currentMonthKey : undefined}
                    onBarClick={drillToMonth}
                    showShortLabels
                  />
                )}
                {view === "month" && (
                  <RevenueBarChart
                    data={month.weeklyRevenue}
                    highlightKey={
                      selectedYear === currentYear && selectedMonth === currentMonth
                        ? currentWeekKey
                        : undefined
                    }
                    onBarClick={drillToWeek}
                    showShortLabels
                  />
                )}
                {view === "week" && (
                  <RevenueBarChart
                    data={week.dailyRevenue}
                    highlightKey={
                      today >= week.weekStart && today <= week.weekEnd ? today : undefined
                    }
                    showShortLabels
                  />
                )}
                {view === "range" && <RevenueBarChart data={range.buckets} showShortLabels />}
              </div>
              {view === "year" && (
                <div className="mt-6 border-t border-gray-100 pt-5">
                  <p className="mb-4 text-sm font-medium text-gray-500">Quarters</p>
                  <QuarterlyChart data={year.quarterlyRevenue} />
                </div>
              )}
            </div>
          </div>
        )}

        {lens === "sources" && (
          <OwnerBoard
            part="sources"
            snapshot={ownerSnapshot}
            leadsReady={leadsReady}
          />
        )}

        {lens === "jobs" && (
          <div className="grid items-start gap-10 md:h-full md:min-h-0 md:grid-rows-[minmax(0,1fr)] md:items-stretch md:overflow-hidden lg:grid-cols-2">
            <div className="md:min-h-0 md:overflow-y-auto">
              <h2 className="text-sm font-medium text-gray-500">Services</h2>
              <div className="mt-4">
                <HorizontalBarList
                  items={periodServices.map((service) => ({
                    name: service.name,
                    value: service.revenue,
                    sub: `${service.count} booking${service.count !== 1 ? "s" : ""}`,
                  }))}
                  color="blue"
                  scale={periodServiceScale}
                  emptyMessage={
                    view === "year"
                      ? "No services booked this year."
                      : view === "range"
                        ? "No services in this range."
                        : "No services in this period."
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-8 md:h-full md:min-h-0 md:overflow-hidden">
              <div className="shrink-0">
                <h2 className="text-sm font-medium text-gray-500">Job status</h2>
                <div className="mt-4">
                  <StatusMix counts={periodStatus} />
                </div>
                {insights.needsFollowUpCount > 0 && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {insights.needsFollowUpCount} job{insights.needsFollowUpCount !== 1 ? "s" : ""}{" "}
                      need follow-up
                    </span>
                  </div>
                )}
              </div>
              {view === "month" && (
                <div className="shrink-0">
                  <h2 className="text-sm font-medium text-gray-500">Still to do</h2>
                  <div className="mt-4">
                    <UpcomingJobs jobs={insights.upcomingJobs} />
                  </div>
                </div>
              )}
              {periodCustomers && (
                <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                  <h2 className="text-sm font-medium text-gray-500">Customers</h2>
                  <div className="mt-4">
                    <TopCustomersList
                      items={periodCustomers}
                      color="blue"
                      scale={periodServiceScale}
                      emptyMessage={
                        view === "range" ? "No customers in this range." : "No customers this year."
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusMix({ counts }: { counts: { status: string; count: number }[] }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
        {total > 0
          ? counts.map(({ status, count }) =>
              count > 0 ? (
                <div
                  key={status}
                  style={{
                    width: `${(count / total) * 100}%`,
                    backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
                  }}
                />
              ) : null
            )
          : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {counts.map(({ status, count }) => (
          <p key={status} className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}
            />
            <span className="font-semibold tabular-nums text-gray-950">{count}</span>
            {status}
          </p>
        ))}
      </div>
    </div>
  );
}

function UpcomingJobs({
  jobs,
}: {
  jobs: {
    _id: string;
    customer: string | { name: string };
    jobDate: string;
    startTime: string;
    finalPrice?: number;
  }[];
}) {
  if (jobs.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">No upcoming jobs on the books.</p>;
  }

  return (
    <div>
      {jobs.map((job) => {
        const customer = typeof job.customer === "object" ? job.customer.name : "Customer";
        return (
          <div
            key={job._id}
            className="flex items-baseline justify-between gap-4 border-t border-gray-100 py-3 first:border-t-0 first:pt-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-950">{customer}</p>
              <p className="text-sm text-gray-500">
                {format(new Date(getJobDateOnly(job.jobDate) + "T12:00:00"), "EEE, MMM d")} · {job.startTime}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-950">
              {formatCurrency(job.finalPrice)}
            </p>
          </div>
        );
      })}
      <Link href="/jobs" className="inline-block pt-3 text-sm font-medium text-brand-blue hover:underline">
        All jobs
      </Link>
    </div>
  );
}
