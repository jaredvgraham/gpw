"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EXPENSE_TYPES, type ExpenseType } from "@/lib/expenses";
import { formatCurrency } from "@/lib/utils";
import {
  TRACKING_RELIABLE_LABEL,
  type JobMoneyStats,
  type LeadFunnel,
  type OwnerSnapshot,
  type SourceBucket,
} from "@/lib/owner-metrics";

type FoundUsChoice = "meta" | SourceBucket;

const FOUND_US_OPTIONS: { id: FoundUsChoice; label: string }[] = [
  { id: "meta", label: "Meta ads" },
  { id: "Google", label: "Google search" },
  { id: "Facebook", label: "Facebook" },
  { id: "Instagram", label: "Instagram" },
  { id: "Friend or neighbor", label: "Friend or neighbor referral" },
  { id: "Previous customer", label: "Previous customer" },
  { id: "Yard sign or truck", label: "Yard sign or saw our truck" },
  { id: "Other", label: "Other" },
  { id: "Website", label: "Didn't say" },
];

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

function money(amount: number): string {
  return formatCurrency(amount);
}

function pct(part: number, whole: number): string | null {
  if (whole <= 0) return null;
  return `${Math.round((part / whole) * 100)}%`;
}

function avgJob(total: number, count: number): string | null {
  if (count <= 0) return null;
  return money(total / count);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-gray-950">{value}</p>
      {hint ? <p className="mt-0.5 text-xs leading-snug text-gray-400">{hint}</p> : null}
    </div>
  );
}

function JobStats({ stats }: { stats: JobMoneyStats }) {
  if (stats.jobs === 0) {
    return <p className="text-sm text-gray-500">No jobs in this period.</p>;
  }
  const average = avgJob(stats.jobTotal, stats.jobs);
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      <Stat label="Jobs" value={String(stats.jobs)} />
      <Stat label="Job total" value={money(stats.jobTotal)} hint={average ? `${average} avg` : undefined} />
      <Stat label="Collected" value={money(stats.collected)} />
      <Stat label="Completed" value={String(stats.completed)} hint={stats.unpaid > 0 ? `${stats.unpaid} unpaid` : undefined} />
      <Stat label="Scheduled" value={String(stats.scheduled)} />
      <Stat label="Follow-up" value={String(stats.followUp)} />
      <Stat
        label="New houses"
        value={String(stats.firstTimeJobs)}
        hint={stats.firstTimeRevenue > 0 ? money(stats.firstTimeRevenue) : undefined}
      />
      <Stat
        label="Repeat"
        value={String(stats.repeatJobs)}
        hint={stats.repeatRevenue > 0 ? money(stats.repeatRevenue) : undefined}
      />
    </div>
  );
}

function FunnelBody({
  funnel,
  showHero = true,
  showCount = true,
}: {
  funnel: LeadFunnel;
  showHero?: boolean;
  showCount?: boolean;
}) {
  const statusUsed = Object.values(funnel.statuses).filter((count) => count > 0).length > 1;
  const rate = pct(funnel.booked, funnel.inquiries);

  if (funnel.inquiries === 0) {
    return (
      <>
        {showCount ? (
          <p className={showHero ? "mt-3 text-sm text-gray-500" : "mt-2 text-sm text-gray-500"}>
            No quotes in this period.
          </p>
        ) : null}
        <div className="mt-4">
          <p className="mb-2 text-sm text-gray-500">Jobs this period</p>
          <JobStats stats={funnel.jobs} />
        </div>
      </>
    );
  }

  return (
    <>
      {showHero ? (
        <>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-gray-950">{rate ?? "—"}</p>
          <p className="mt-2 text-sm text-gray-500">
            {funnel.booked} booked of {funnel.inquiries} that came in
            {funnel.jobs.jobTotal > 0 ? ` · ${money(funnel.jobs.jobTotal)} in jobs` : ""}
          </p>
        </>
      ) : showCount ? (
        <p className="mt-1 text-sm text-gray-500">
          {funnel.booked} booked of {funnel.inquiries} that came in
          {rate ? ` · ${rate}` : ""}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Stat label="Not booked" value={String(funnel.inquiries - funnel.booked)} />
        <Stat
          label="With address"
          value={String(funnel.matchable)}
          hint={
            pct(funnel.matchableBooked, funnel.matchable)
              ? `${pct(funnel.matchableBooked, funnel.matchable)} of those booked`
              : undefined
          }
        />
        <Stat label="No address" value={String(funnel.inquiries - funnel.matchable)} />
        <Stat
          label="Avg days to book"
          value={funnel.avgDaysToBook === null ? "—" : String(funnel.avgDaysToBook)}
        />
        <Stat label="With email" value={String(funnel.withEmail)} />
        <Stat label="With photos" value={String(funnel.withPhotos)} />
        <Stat label="With message" value={String(funnel.withMessage)} />
        {statusUsed ? (
          <Stat
            label="Lead status"
            value={`${funnel.statuses.new} new`}
            hint={`${funnel.statuses.contacted} contacted · ${funnel.statuses.converted} converted · ${funnel.statuses.lost} lost`}
          />
        ) : null}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm text-gray-500">Jobs this period</p>
        <JobStats stats={funnel.jobs} />
      </div>
      {funnel.services.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm text-gray-500">Services they asked for</p>
          <ul className="mt-2 space-y-1.5">
            {funnel.services.map((row) => {
              const share = funnel.services[0] ? (row.count / funnel.services[0].count) * 100 : 0;
              return (
                <li key={row.name}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-950">{row.name}</span>
                    <span className="tabular-nums text-gray-500">{row.count}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-brand-blue" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function VolumeBar({
  inquiries,
  booked,
  maxInquiries,
}: {
  inquiries: number;
  booked: number;
  maxInquiries: number;
}) {
  const volume = maxInquiries > 0 ? (inquiries / maxInquiries) * 100 : 0;
  const bookedShare = inquiries > 0 ? (booked / inquiries) * 100 : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-gray-100">
      <div
        className="flex h-full overflow-hidden rounded-full"
        style={{ width: `${inquiries > 0 ? Math.max(volume, 6) : 0}%` }}
      >
        <div className="h-full bg-brand-blue" style={{ width: `${bookedShare}%` }} />
        <div className="h-full flex-1 bg-gray-300" />
      </div>
    </div>
  );
}

function StepFunnel({ quotes, booked }: { quotes: number; booked: number }) {
  if (quotes === 0) return null;
  const bookedWidth = Math.max((booked / quotes) * 100, booked > 0 ? 12 : 0);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-10 w-full items-center justify-between rounded-xl bg-gray-100 px-3">
        <span className="text-sm text-gray-500">Came in</span>
        <span className="text-sm font-semibold tabular-nums text-gray-950">{quotes}</span>
      </div>
      <div
        className="flex h-10 items-center justify-between rounded-xl bg-brand-blue px-3 text-white"
        style={{ width: `${bookedWidth}%`, minWidth: booked > 0 ? "7rem" : 0 }}
      >
        <span className="text-sm text-white/80">Booked</span>
        <span className="text-sm font-semibold tabular-nums">{booked}</span>
      </div>
    </div>
  );
}

function FoundUsDetail({
  choice,
  snapshot,
}: {
  choice: FoundUsChoice;
  snapshot: OwnerSnapshot;
}) {
  const { meta, foundUs, googleAds } = snapshot;
  const metaReturn = meta.spend > 0 ? meta.jobTotal / meta.spend : null;
  const metaCostPerLead = meta.inquiries > 0 && meta.spend > 0 ? meta.spend / meta.inquiries : null;
  const metaCostPerBooked = meta.booked > 0 && meta.spend > 0 ? meta.spend / meta.booked : null;
  const googleAdReturn = googleAds.spend > 0 ? googleAds.jobs.jobTotal / googleAds.spend : null;

  if (choice === "meta") {
    return (
      <div className="space-y-4">
        <StepFunnel quotes={meta.inquiries} booked={meta.booked} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Stat label="Ad spend" value={money(meta.spend)} />
          <Stat
            label="Return"
            value={metaReturn === null ? "—" : `${metaReturn.toFixed(1)}×`}
            hint={meta.spend > 0 ? `${money(meta.jobTotal)} jobs` : "No Meta spend in notes"}
          />
          <Stat label="Cost / lead" value={metaCostPerLead === null ? "—" : money(metaCostPerLead)} />
          <Stat label="Cost / booked" value={metaCostPerBooked === null ? "—" : money(metaCostPerBooked)} />
        </div>
        <FunnelBody funnel={meta.instantForm} showHero={false} showCount={false} />
        {meta.marked.jobs > 0 ? (
          <div>
            <p className="mb-2 text-sm text-gray-500">Also marked Meta, no landing quote</p>
            <JobStats stats={meta.marked} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StepFunnel quotes={foundUs[choice].inquiries} booked={foundUs[choice].booked} />
      <FunnelBody funnel={foundUs[choice]} showHero={false} showCount={false} />
      {choice === "Google" ? (
        <div>
          <p className="text-sm text-gray-500">
            Google Ads: {googleAds.jobs.jobs} marked
            {googleAds.jobs.jobTotal > 0 ? ` · ${money(googleAds.jobs.jobTotal)} in jobs` : ""}
            {googleAds.spend > 0 ? ` · ${money(googleAds.spend)} spend` : ""}
            {googleAdReturn !== null && googleAds.jobs.jobs > 0 ? ` · ${googleAdReturn.toFixed(1)}×` : ""}
          </p>
          <p className="mt-1 text-xs leading-snug text-amber-800">
            Google Ads jobs are not tracked automatically. Only jobs you marked count here.
          </p>
          {googleAds.jobs.jobs > 0 ? (
            <div className="mt-3">
              <JobStats stats={googleAds.jobs} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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
  const [foundUsChoice, setFoundUsChoice] = useState<FoundUsChoice>("meta");
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

  const meta = snapshot?.meta;
  const foundUs = snapshot?.foundUs;
  const maxFoundUsInquiries =
    snapshot && meta && foundUs
      ? Math.max(
          meta.inquiries,
          ...FOUND_US_OPTIONS.filter(
            (option): option is { id: SourceBucket; label: string } => option.id !== "meta"
          ).map((option) => foundUs[option.id].inquiries),
          1
        )
      : 1;

  return (
    <div>
      {snapshot?.earlyTracking && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          These numbers can be misleading. Tracking implementation only started after {TRACKING_RELIABLE_LABEL}.
        </p>
      )}

      {!leadsReady || !snapshot || !meta || !foundUs ? (
        <p className="text-sm text-gray-500">Loading leads…</p>
      ) : (
        <>
          <div className="mb-8 border-b border-gray-100 pb-5">
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

          <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200">
            <div className="border-b border-gray-100 px-4 py-3.5">
              <p className="text-sm text-gray-500">How they found us</p>
              <p className="mt-1 text-sm text-gray-500">
                Bar length is quotes. Blue is booked. Same website form, split by how they found us.
              </p>
            </div>
            <div>
              {FOUND_US_OPTIONS.map((option) => {
                const funnel = option.id === "meta" ? meta.instantForm : foundUs[option.id];
                const inquiries = option.id === "meta" ? meta.inquiries : funnel.inquiries;
                const booked = option.id === "meta" ? meta.booked : funnel.booked;
                const jobTotal = option.id === "meta" ? meta.jobTotal : funnel.jobs.jobTotal;
                const selected = foundUsChoice === option.id;
                const rate = pct(booked, inquiries);
                return { option, inquiries, booked, jobTotal, selected, rate };
              })
                .sort((a, b) => b.inquiries - a.inquiries || b.jobTotal - a.jobTotal)
                .map(({ option, inquiries, booked, jobTotal, selected, rate }) => (
                  <div key={option.id} className="border-t border-gray-100 first:border-t-0">
                    <button
                      type="button"
                      aria-expanded={selected}
                      onClick={() => setFoundUsChoice(option.id)}
                      className={`w-full px-4 py-3 text-left ${selected ? "bg-gray-50" : ""}`}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-medium text-gray-950">{option.label}</span>
                        <span className="text-sm tabular-nums text-gray-500">
                          {inquiries === 0 ? "No quotes" : `${rate ?? "0%"} · ${money(jobTotal)}`}
                        </span>
                      </div>
                      <div className="mt-2">
                        <VolumeBar inquiries={inquiries} booked={booked} maxInquiries={maxFoundUsInquiries} />
                      </div>
                      {inquiries > 0 ? (
                        <p className="mt-1.5 text-xs tabular-nums text-gray-400">
                          {booked} booked of {inquiries}
                        </p>
                      ) : null}
                    </button>
                    {selected ? (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3.5">
                        <FoundUsDetail choice={option.id} snapshot={snapshot} />
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          </section>

          {snapshot.untracked.jobs > 0 ? (
            <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 px-4 py-3.5">
              <p className="text-sm text-gray-500">Untracked</p>
              <p className="mt-1 text-sm text-gray-500">Jobs with no matching website quote.</p>
              <div className="mt-3">
                <JobStats stats={snapshot.untracked} />
              </div>
            </section>
          ) : null}

          <div className="flex items-baseline justify-between gap-4 border-t border-gray-200 pt-4">
            <div>
              <p className="font-medium text-gray-950">All sources</p>
              {snapshot.inquiryTotal > 0 ? (
                <p className="mt-0.5 text-sm text-gray-500">
                  {snapshot.bookedTotal} booked of {snapshot.inquiryTotal} that came in
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
        </>
      )}
    </div>
  );
}
