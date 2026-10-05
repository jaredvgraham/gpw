"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { addDays, endOfMonth, endOfYear, format, startOfMonth, startOfYear } from "date-fns";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MetricCard from "@/components/dashboard/MetricCard";
import RevenueBarChart from "@/components/dashboard/RevenueBarChart";
import HorizontalBarList from "@/components/dashboard/HorizontalBarList";
import TopCustomersList from "@/components/dashboard/TopCustomersList";
import QuarterlyChart from "@/components/dashboard/QuarterlyChart";
import InsightsBreadcrumb from "@/components/dashboard/InsightsBreadcrumb";
import GrossNetSection from "@/components/dashboard/GrossNetSection";
import InsightsHero from "@/components/dashboard/InsightsHero";
import ChartCard from "@/components/dashboard/ChartCard";
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
import { useJobModals } from "@/contexts/JobModalContext";
import { useAppData } from "@/contexts/AppDataContext";
import { getJobDateOnly } from "@/lib/dates";
import type { Expense } from "@/types";

export default function DashboardPage() {
  const { openNewJob } = useJobModals();
  const { jobs, jobsLoading } = useAppData();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = format(now, "yyyy-MM-dd");

  const [view, setView] = useState<PeriodView>("year");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => calendarWeekRange(today).start);
  const [rangeStart, setRangeStart] = useState(() => format(startOfMonth(now), "yyyy-MM-dd"));
  const [rangeEnd, setRangeEnd] = useState(() => format(endOfMonth(now), "yyyy-MM-dd"));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesReady, setExpensesReady] = useState(false);

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
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { month, week, year } = insights;

  const yoyTrend =
    year.yearOverYearChange !== null
      ? {
          value: `${year.yearOverYearChange >= 0 ? "+" : ""}${year.yearOverYearChange.toFixed(1)}% vs ${year.year - 1}`,
          positive: year.yearOverYearChange >= 0,
        }
      : undefined;

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
    <div className="pb-8">
      <PageHeader
        title="Business Insights"
        description="Revenue, expenses, and job performance"
        action={
          <button
            type="button"
            onClick={() => openNewJob()}
            className="inline-flex items-center rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            + Add Job
          </button>
        }
      />

      <div className="mb-6 rounded-2xl border border-brand-border bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InsightsBreadcrumb
            view={view}
            year={selectedYear}
            month={selectedMonth}
            weekLabel={week.label}
            rangeLabel={range.label}
            onNavigate={handleBreadcrumbNavigate}
          />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/today"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-gray/40 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-brand-gray"
            >
              <Calendar className="h-3.5 w-3.5 text-brand-blue" />
              Today · {insights.todayJobs.length}
            </Link>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-gray/40 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-brand-gray"
            >
              <Clock className="h-3.5 w-3.5 text-brand-blue" />
              Tomorrow · {insights.tomorrowJobs.length}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

      <GrossNetSection
        gross={profit.gross}
        expenses={profit.expensesTotal}
        net={profit.net}
        expensesReady={expensesReady}
      />

      {view === "year" && (
        <div className="space-y-6">
          <InsightsHero
            title={`${selectedYear} revenue`}
            revenue={year.revenueTotal}
            jobs={year.jobsTotal}
            meta={
              year.bestMonth
                ? `Best month: ${year.bestMonth.label} (${formatCurrency(year.bestMonth.revenue)})`
                : undefined
            }
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricCard
              label="Completed"
              value={String(year.jobsCompleted)}
              sub={`${year.uniqueCustomers} customers`}
              icon={CheckCircle}
              accent="green"
            />
            <MetricCard
              label="Avg job"
              value={formatCurrency(year.averageJobValue)}
              icon={BarChart3}
              accent="blue"
            />
            <MetricCard
              label="YoY"
              value={
                year.yearOverYearChange !== null
                  ? `${year.yearOverYearChange >= 0 ? "+" : ""}${year.yearOverYearChange.toFixed(1)}%`
                  : "—"
              }
              sub={
                year.priorYearRevenue !== null
                  ? `${formatCurrency(year.priorYearRevenue)} last year`
                  : "No prior year"
              }
              icon={
                year.yearOverYearChange !== null && year.yearOverYearChange < 0
                  ? TrendingDown
                  : TrendingUp
              }
              accent={
                year.yearOverYearChange !== null && year.yearOverYearChange < 0 ? "red" : "green"
              }
              trend={yoyTrend}
            />
          </div>

          <ChartCard
            title="Monthly revenue"
            description="Tap a month to see weekly breakdown"
          >
            <RevenueBarChart
              data={year.monthlyRevenue}
              highlightKey={selectedYear === currentYear ? currentMonthKey : undefined}
              onBarClick={drillToMonth}
              showShortLabels
            />
          </ChartCard>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              By quarter
            </h2>
            <QuarterlyChart data={year.quarterlyRevenue} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title={`Top services · ${selectedYear}`}>
              <HorizontalBarList
                items={year.topServices.map((s) => ({
                  name: s.name,
                  value: s.revenue,
                  sub: `${s.count} booking${s.count !== 1 ? "s" : ""}`,
                }))}
                color="red"
                emptyMessage="No services booked this year."
              />
            </Card>
            <Card title={`Top customers · ${selectedYear}`}>
              <TopCustomersList
                items={year.topCustomers}
                color="blue"
                emptyMessage="No customers this year."
              />
            </Card>
          </div>

          <Card title="Job status">
            <StatusGrid counts={year.statusCounts} />
          </Card>
        </div>
      )}

      {view === "month" && (
        <div className="space-y-6">
          <InsightsHero
            title={month.label}
            revenue={month.revenue}
            jobs={month.jobsTotal}
            meta={`${month.completed} completed · ${month.scheduled} scheduled`}
          />

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Pipeline"
              value={formatCurrency(month.pipeline)}
              sub="Upcoming work"
              icon={Banknote}
              accent="blue"
            />
            <MetricCard
              label="Avg completed"
              value={formatCurrency(month.averageCompletedJobValue)}
              icon={Wallet}
              accent="green"
            />
          </div>

          <ChartCard
            title="Weekly breakdown"
            description="Monday–Sunday · tap a week for each day"
          >
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
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Top services">
              <HorizontalBarList
                items={month.topServices.map((s) => ({
                  name: s.name,
                  value: s.revenue,
                  sub: `${s.count} booking${s.count !== 1 ? "s" : ""}`,
                }))}
                color="red"
              />
            </Card>
            <Card title="Job status">
              <StatusGrid counts={month.statusCounts} />
              {insights.needsFollowUpCount > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {insights.needsFollowUpCount} job{insights.needsFollowUpCount !== 1 ? "s" : ""}{" "}
                    need follow-up
                  </span>
                </div>
              )}
            </Card>
          </div>

          <Card title="Upcoming pipeline">
            <UpcomingJobs jobs={insights.upcomingJobs} />
          </Card>
        </div>
      )}

      {view === "week" && (
        <div className="space-y-6">
          <InsightsHero
            title={week.label}
            revenue={week.revenue}
            jobs={week.jobsTotal}
            meta={`${week.completed} completed · ${week.scheduled} scheduled`}
          />

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Avg job"
              value={formatCurrency(week.averageJobValue)}
              icon={BarChart3}
              accent="blue"
            />
            <MetricCard
              label="Cancelled"
              value={String(week.cancelled)}
              icon={CheckCircle}
              accent="red"
            />
          </div>

          <ChartCard title="Daily breakdown" description="Monday through Sunday">
            <RevenueBarChart
              data={week.dailyRevenue}
              highlightKey={
                today >= week.weekStart && today <= week.weekEnd ? today : undefined
              }
              showShortLabels
            />
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Top services">
              <HorizontalBarList
                items={week.topServices.map((s) => ({
                  name: s.name,
                  value: s.revenue,
                  sub: `${s.count} booking${s.count !== 1 ? "s" : ""}`,
                }))}
                color="red"
              />
            </Card>
            <Card title="Job status">
              <StatusGrid counts={week.statusCounts} />
            </Card>
          </div>
        </div>
      )}

      {view === "range" && (
        <div className="space-y-6">
          <InsightsHero
            title={range.label}
            revenue={range.revenue}
            jobs={range.jobsTotal}
            meta={`${range.completed} completed · ${range.scheduled} scheduled`}
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricCard
              label="Avg job"
              value={formatCurrency(range.averageJobValue)}
              icon={BarChart3}
              accent="blue"
            />
            <MetricCard
              label="Customers"
              value={String(range.uniqueCustomers)}
              icon={Users}
              accent="green"
            />
            <MetricCard
              label="Cancelled"
              value={String(range.cancelled)}
              icon={CheckCircle}
              accent="red"
            />
          </div>

          <ChartCard title="Breakdown" description={range.bucketDescription}>
            <RevenueBarChart data={range.buckets} showShortLabels />
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Top services">
              <HorizontalBarList
                items={range.topServices.map((service) => ({
                  name: service.name,
                  value: service.revenue,
                  sub: `${service.count} booking${service.count !== 1 ? "s" : ""}`,
                }))}
                color="red"
                emptyMessage="No services in this range."
              />
            </Card>
            <Card title="Top customers">
              <TopCustomersList
                items={range.topCustomers}
                color="blue"
                emptyMessage="No customers in this range."
              />
            </Card>
          </div>

          <Card title="Job status">
            <StatusGrid counts={range.statusCounts} />
          </Card>
        </div>
      )}
    </div>
  );
}

function StatusGrid({ counts }: { counts: { status: string; count: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {counts.map(({ status, count }) => (
        <div
          key={status}
          className="rounded-xl border border-brand-border bg-brand-gray/20 px-3 py-3"
          style={{ borderLeftWidth: 4, borderLeftColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{status}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-black">{count}</p>
        </div>
      ))}
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
    <div className="space-y-2">
      {jobs.map((job) => {
        const customer = typeof job.customer === "object" ? job.customer.name : "Customer";
        return (
          <div
            key={job._id}
            className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-gray/20 px-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-black">{customer}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(getJobDateOnly(job.jobDate) + "T12:00:00"), "EEE, MMM d")} ·{" "}
                {job.startTime}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold tabular-nums text-brand-red">
              {formatCurrency(job.finalPrice)}
            </p>
          </div>
        );
      })}
      <Link
        href="/jobs"
        className="inline-block pt-1 text-sm font-semibold text-brand-blue hover:underline"
      >
        View all jobs →
      </Link>
    </div>
  );
}
