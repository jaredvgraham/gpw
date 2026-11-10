"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EXPENSE_TYPES, type ExpenseType } from "@/lib/expenses";
import { formatCurrency } from "@/lib/utils";
import { TRACKING_RELIABLE_LABEL, type OwnerSnapshot, type SourceRow } from "@/lib/owner-metrics";

type CostChoice = "mix" | "all" | ExpenseType;
type AdChoice = "all" | "meta" | "google";

const COST_OPTIONS: { id: CostChoice; label: string }[] = [
  { id: "mix", label: "Gas, bleach, and ads" },
  { id: "all", label: "All expenses" },
  ...EXPENSE_TYPES.map((type) => ({ id: type, label: type })),
];

const AD_OPTIONS: { id: AdChoice; label: string }[] = [
  { id: "meta", label: "Meta Ads" },
  { id: "google", label: "Google Ads" },
  { id: "all", label: "All ads" },
];

const NET_VS_AD_OPTIONS: { id: AdChoice; label: string }[] = [
  { id: "all", label: "Net vs all ads" },
  { id: "meta", label: "Net vs Meta Ads" },
  { id: "google", label: "Net vs Google Ads" },
];

function InsightSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pr-7 pl-2.5 text-[13px] font-medium text-gray-950 outline-none"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
    </label>
  );
}

function costAmount(snapshot: OwnerSnapshot, choice: CostChoice): number {
  if (choice === "mix") return snapshot.materials + snapshot.adSpend;
  if (choice === "all") return snapshot.expensesByType.reduce((sum, slice) => sum + slice.amount, 0);
  return snapshot.expensesByType.find((slice) => slice.type === choice)?.amount ?? 0;
}

function adSlice(snapshot: OwnerSnapshot, choice: AdChoice): { spend: number; revenue: number } {
  if (choice === "meta") return { spend: snapshot.metaAdSpend, revenue: snapshot.metaAdRevenue };
  if (choice === "google") return { spend: snapshot.googleAdSpend, revenue: snapshot.googleAdRevenue };
  return { spend: snapshot.adSpend, revenue: snapshot.adRevenue };
}

function adWarnings(choice: AdChoice, earlyTracking: boolean): string[] {
  const notes: string[] = [];
  if (choice === "all" || choice === "google") {
    notes.push("Google Ads jobs are not tracked automatically yet, so this number is incomplete.");
  }
  if ((choice === "all" || choice === "meta") && earlyTracking) {
    notes.push(
      `Meta tracking started after ${TRACKING_RELIABLE_LABEL}. Numbers from before that are incomplete.`
    );
  }
  return notes;
}

function sourceDetail(row: SourceRow): string {
  const parts: string[] = [];
  if (row.booked !== null && row.matchable > 0) {
    parts.push(`${row.booked} of ${row.matchable} booked`);
  } else if (row.inquiries > 0) {
    parts.push(`${row.inquiries} lead${row.inquiries === 1 ? "" : "s"}`);
  }
  if (row.collected > 0) parts.push(`${money(row.collected)} collected`);
  return parts.join(" · ");
}

function money(amount: number): string {
  return formatCurrency(amount);
}

export default function OwnerBoard({
  snapshot,
  leadsReady,
  part,
  net = null,
}: {
  snapshot: OwnerSnapshot | null;
  leadsReady: boolean;
  part: "money" | "sources";
  net?: number | null;
}) {
  const [costChoice, setCostChoice] = useState<CostChoice>("mix");
  const [adChoice, setAdChoice] = useState<AdChoice>("meta");
  const [netVsAdChoice, setNetVsAdChoice] = useState<AdChoice>("all");
  const sources = snapshot
    ? [...snapshot.sources].sort((a, b) => b.jobTotal - a.jobTotal || b.inquiries - a.inquiries)
    : [];
  const houses = snapshot ? snapshot.firstTimeJobs + snapshot.repeatJobs : 0;
  const ads = snapshot ? adSlice(snapshot, adChoice) : { spend: 0, revenue: 0 };
  const netVsAds = snapshot ? adSlice(snapshot, netVsAdChoice) : { spend: 0, revenue: 0 };
  const adMultiple = ads.spend > 0 ? ads.revenue / ads.spend : null;
  const periodNetMultiple = netVsAds.spend > 0 && net !== null ? net / netVsAds.spend : null;
  const adNotes = snapshot ? adWarnings(adChoice, snapshot.earlyTracking) : [];
  const jobCost = snapshot ? costAmount(snapshot, costChoice) : 0;
  const jobCostPerJob =
    snapshot && snapshot.completedJobs > 0 ? jobCost / snapshot.completedJobs : null;

  if (part === "money") {
    if (!snapshot) return <p className="text-sm text-gray-500">Loading expenses…</p>;
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0 border-b border-gray-100 px-4 py-3.5 sm:border-r lg:border-b-0">
            <InsightSelect
              label="Ad return source"
              value={adChoice}
              onChange={setAdChoice}
              options={AD_OPTIONS}
            />
            <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-gray-950">
              {adMultiple === null ? money(ads.spend) : `${adMultiple.toFixed(1)}×`}
            </p>
            {adMultiple !== null ? (
              <p className="mt-2 text-xs leading-snug text-gray-400">
                {money(ads.spend)} spent · {money(ads.revenue)} in jobs
              </p>
            ) : ads.revenue > 0 ? (
              <p className="mt-2 text-xs leading-snug text-gray-400">
                {money(ads.revenue)} in jobs · no spend in notes
              </p>
            ) : null}
            {adNotes.length > 0 ? (
              <div className="mt-2.5 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                {adNotes.map((note) => (
                  <p key={note} className="text-xs leading-snug text-amber-900">
                    {note}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 border-b border-gray-100 px-4 py-3.5 lg:border-r lg:border-b-0">
            <InsightSelect
              label="Net versus ad spend"
              value={netVsAdChoice}
              onChange={setNetVsAdChoice}
              options={NET_VS_AD_OPTIONS}
            />
            <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-gray-950">
              {periodNetMultiple === null
                ? net === null
                  ? "—"
                  : money(net)
                : `${periodNetMultiple.toFixed(1)}×`}
            </p>
            {net !== null ? (
              <p className="mt-2 text-xs leading-snug text-gray-400">
                {money(netVsAds.spend)} ads · {money(net)} net this period
              </p>
            ) : null}
          </div>
          <div className="min-w-0 px-4 py-3.5 sm:col-span-2 lg:col-span-1">
            <InsightSelect
              label="Costs counted per job"
              value={costChoice}
              onChange={setCostChoice}
              options={COST_OPTIONS}
            />
            <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-gray-950">
              {jobCostPerJob === null ? (
                money(jobCost)
              ) : (
                <>
                  {money(jobCostPerJob)}
                  <span className="text-sm font-medium text-gray-400"> / job</span>
                </>
              )}
            </p>
            {jobCostPerJob !== null ? (
              <p className="mt-2 text-xs leading-snug text-gray-400">
                {money(jobCost)} · {snapshot.completedJobs} done
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {snapshot?.earlyTracking && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          These numbers can be misleading. Tracking implementation only started after {TRACKING_RELIABLE_LABEL}.
        </p>
      )}

      {snapshot ? (
        <div className="mb-6 border-b border-gray-100 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <div>
              <p className="text-sm text-gray-500">Houses</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-gray-950">
                {snapshot.firstTimeJobs}
                <span className="text-base font-medium text-gray-400"> new</span>
                <span className="text-base font-medium text-gray-400"> · {snapshot.repeatJobs} repeat</span>
              </p>
            </div>
            <p className="text-sm text-gray-500">
              {money(snapshot.firstTimeRevenue)} new · {money(snapshot.repeatRevenue)} repeat
            </p>
          </div>
          {houses > 0 ? (
            <div className="mt-3 flex h-1.5 max-w-sm overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-brand-blue" style={{ width: `${(snapshot.firstTimeJobs / houses) * 100}%` }} />
              <div className="h-full bg-gray-400" style={{ width: `${(snapshot.repeatJobs / houses) * 100}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
          <h2 className="text-sm font-medium text-gray-500">Sources</h2>
          {!leadsReady || !snapshot ? (
            <p className="mt-4 text-sm text-gray-500">Loading leads…</p>
          ) : sources.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No leads or jobs in this period.</p>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
              {sources.map((row) => {
                const share = snapshot.jobTotal > 0 ? (row.jobTotal / snapshot.jobTotal) * 100 : 0;
                return (
                  <div
                    key={row.source}
                    className="border-t border-gray-100 py-3 first:border-t-0 first:pt-0 lg:nth-[-n+2]:border-t-0 lg:nth-[-n+2]:pt-0"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-medium text-gray-950">{row.source}</p>
                      <p className="text-lg font-semibold tabular-nums tracking-tight text-gray-950">
                        {money(row.jobTotal)}
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${share}%` }} />
                    </div>
                    {sourceDetail(row) ? (
                      <p className="mt-2 text-sm text-gray-500">{sourceDetail(row)}</p>
                    ) : null}
                  </div>
                );
              })}
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-gray-200 pt-4">
                <div>
                  <p className="font-medium text-gray-950">All sources</p>
                  {snapshot.matchableTotal > 0 ? (
                    <p className="mt-0.5 text-sm text-gray-500">
                      {snapshot.bookedTotal} of {snapshot.matchableTotal} booked
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums tracking-tight text-gray-950">
                    {money(snapshot.jobTotal)}
                  </p>
                  <p className="text-sm text-gray-500">{money(snapshot.collectedTotal)} collected</p>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
