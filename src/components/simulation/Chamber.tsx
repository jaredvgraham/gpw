"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Valve from "./Valve";
import Yield from "./Yield";
import { VB, pct, ribbon, spine, vRibbon, vSpine } from "./geometry";
import {
  LEVER_BY_ID,
  money,
  num,
  pct as pctFmt,
  type LeverId,
  type Levers,
  type NodeId,
  type Outputs,
} from "@/lib/simulation/model";

export type StationId = "ads" | "leads" | "jobs" | "revenue" | "profit";

export const NODE_STATION: Record<NodeId, StationId> = {
  adSpend: "ads",
  adLeads: "leads",
  leads: "leads",
  demand: "jobs",
  capacity: "jobs",
  jobs: "jobs",
  revenue: "revenue",
  materials: "profit",
  expenses: "profit",
  net: "profit",
  perOwner: "profit",
};

export const STATION_COLOR: Record<StationId, string> = {
  ads: "var(--ink-heat)",
  leads: "var(--ink-lead)",
  jobs: "var(--ink-work)",
  revenue: "var(--ink-cash)",
  profit: "var(--ink-yield)",
};

export interface Pulse {
  id: number;
  hot: Set<StationId>;
  blocked: StationId | null;
}

interface ChamberProps {
  levers: Levers;
  actualLevers: Levers;
  view: Outputs;
  actualView: Outputs;
  pulse: Pulse | null;
  inspect: StationId | null;
  onInspect: (id: StationId | null) => void;
  onLever: (id: LeverId, value: number) => void;
  onLeverBegin: (id: LeverId) => void;
  onLeverEnd: (id: LeverId) => void;
}

interface Band {
  x: number;
  y: number;
  w: number;
  h: number;
}

function layout(view: Outputs, levers: Levers) {
  const repeat = Math.max(0, view.demand - view.leads * levers.closeRate);
  const countMax = Math.max(view.leads, view.demand, view.capacity, view.jobs, view.adLeads, view.organicLeads, repeat, 4);
  const moneyMax = Math.max(view.revenue, view.expenses, view.adSpend, 400);

  let cScale = 188 / countMax;
  const sourceStack = view.adLeads * cScale + view.organicLeads * cScale + 44;
  if (sourceStack > 240) cScale *= 240 / sourceStack;
  const mScale = 118 / moneyMax;

  const cH = (v: number) => Math.max(7, Math.max(0, v) * cScale);
  const mH = (v: number) => Math.max(7, Math.max(0, v) * mScale);

  const paidH = cH(view.adLeads);
  const orgH = cH(view.organicLeads);
  const leadsH = cH(view.leads);
  const demandH = cH(view.demand);
  const capH = cH(view.capacity);
  const jobsH = cH(view.jobs);
  const overflowH = view.turnedAway > 0.35 ? cH(view.turnedAway) : 0;
  const repeatH = cH(repeat);
  const closedH = cH(view.leads * levers.closeRate);
  const revH = mH(view.revenue);
  const adsCostH = mH(view.adSpend);
  const matH = mH(view.materials);
  const fixH = mH(view.fixed);
  const netH = mH(Math.max(0, view.net));
  const lossH = mH(Math.max(0, -view.net));

  const paid: Band = { x: 52, y: 52, w: 86, h: paidH };
  const organic: Band = { x: 52, y: 52 + paidH + 40, w: 86, h: orgH };

  const sourceBottom = organic.y + organic.h;
  const leads: Band = {
    x: 248,
    y: paid.y + Math.max(0, (sourceBottom - paid.y - leadsH) / 2),
    w: 92,
    h: leadsH,
  };

  const paidShare = view.leads > 0 ? view.adLeads / view.leads : 0.5;
  const leadsPaidH = leads.h * paidShare;
  const leadsOrgH = leads.h - leadsPaidH;

  const floor = 292;
  const tankH = Math.max(capH, jobsH + overflowH, 24);
  const tank: Band = { x: 696, y: floor - tankH, w: 108, h: tankH };
  const jobs: Band = { x: 696, y: floor - jobsH, w: 108, h: jobsH };
  const overflow: Band | null =
    overflowH > 0 ? { x: 696, y: tank.y - overflowH, w: 108, h: overflowH } : null;

  const demand: Band = {
    x: 470,
    y: Math.min(jobs.y, floor - demandH),
    w: 92,
    h: demandH,
  };

  const closed: Band = { x: demand.x, y: demand.y, w: demand.w, h: Math.min(closedH, demand.h) };
  const repeatBand: Band = {
    x: 248,
    y: Math.min(520, leads.y + leads.h + 36),
    w: 92,
    h: repeatH,
  };

  const revenue: Band = { x: 696, y: 368, w: 108, h: revH };
  const costsTop = 368 + revH + 18;
  const adsCost: Band = { x: 696, y: costsTop, w: 108, h: adsCostH };
  const materials: Band = { x: 696, y: costsTop + adsCostH, w: 108, h: matH };
  const fixed: Band = { x: 696, y: costsTop + adsCostH + matH, w: 108, h: fixH };

  const disc = { cx: 1186, cy: 318, r: 152 };
  const netBand: Band = {
    x: 920,
    y: revenue.y,
    w: 48,
    h: view.net >= 0 ? netH : Math.max(8, lossH),
  };

  return {
    paid,
    organic,
    leads,
    leadsPaidH,
    leadsOrgH,
    demand,
    closed,
    repeat: repeatBand,
    repeatCount: repeat,
    tank,
    jobs,
    overflow,
    revenue,
    adsCost,
    materials,
    fixed,
    netBand,
    disc,
    cScale,
    mScale,
  };
}

function dir(diff: number, eps: number): "up" | "down" | undefined {
  if (diff > eps) return "up";
  if (diff < -eps) return "down";
  return undefined;
}

function DeltaChip({ value, actual, format }: { value: number; actual: number; format: (v: number, o?: { sign?: boolean }) => string }) {
  const d = dir(value - actual, Math.max(0.4, Math.abs(actual) * 0.008));
  if (!d) return <span className="sim-chip-actual">actual</span>;
  return (
    <span className="sim-chip" data-dir={d}>
      {format(value - actual, { sign: true })}
    </span>
  );
}

function NodeMark({
  id,
  x,
  y,
  w,
  kicker,
  value,
  sub,
  chip,
  hot,
  blocked,
  inspect,
  onInspect,
  attach = "above",
}: {
  id: StationId;
  x: number;
  y: number;
  w: number;
  kicker: string;
  value: string;
  sub?: ReactNode;
  chip?: ReactNode;
  hot: boolean;
  blocked?: boolean;
  inspect: StationId | null;
  onInspect: (id: StationId) => void;
  attach?: "above" | "inside";
}) {
  const top = attach === "inside" ? y + 4 : Math.max(8, y - 42);
  return (
    <button
      type="button"
      className="sim-node"
      data-hot={hot}
      data-blocked={blocked ?? false}
      data-inspect={inspect === id}
      data-attach={attach}
      style={{ ...pct(x, top), width: `${(w / VB.w) * 100}%`, "--accent": STATION_COLOR[id] } as CSSProperties}
      onClick={() => onInspect(id)}
    >
      <span className="sim-node-k">{kicker}</span>
      <span className="sim-node-v">{value}</span>
      {sub ? <span className="sim-node-s">{sub}</span> : null}
      {chip ? <span className="sim-node-chip">{chip}</span> : null}
    </button>
  );
}

export default function Chamber({
  levers,
  actualLevers,
  view,
  actualView,
  pulse,
  inspect,
  onInspect,
  onLever,
  onLeverBegin,
  onLeverEnd,
}: ChamberProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [fit, setFit] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / VB.w, rect.height / VB.h);
      const width = VB.w * scale;
      const height = VB.h * scale;
      setFit({
        left: (rect.width - width) / 2,
        top: (rect.height - height) / 2,
        width,
        height,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const L = layout(view, levers);
  const G = layout(actualView, actualLevers);
  const hot = (id: StationId) => pulse?.hot.has(id) ?? false;
  const blocked = (id: StationId) => pulse?.blocked === id;

  const valve = (id: LeverId, accent: string, unit?: string, compact?: boolean) => (
    <Valve
      key={id}
      meta={LEVER_BY_ID[id]}
      value={levers[id]}
      actual={actualLevers[id]}
      accent={accent}
      unit={unit}
      compact={compact}
      onChange={onLever}
      onBegin={onLeverBegin}
      onEnd={onLeverEnd}
    />
  );

  const paidToLeads = ribbon(L.paid.x + L.paid.w, L.paid.y, L.paid.h, L.leads.x, L.leads.y, L.leadsPaidH);
  const orgToLeads = ribbon(
    L.organic.x + L.organic.w,
    L.organic.y,
    L.organic.h,
    L.leads.x,
    L.leads.y + L.leadsPaidH,
    L.leadsOrgH
  );
  const leadsToDemand = ribbon(L.leads.x + L.leads.w, L.leads.y, L.leads.h, L.demand.x, L.closed.y, L.closed.h);
  const repeatToDemand = ribbon(
    L.repeat.x + L.repeat.w,
    L.repeat.y,
    L.repeat.h,
    L.demand.x,
    L.demand.y + L.closed.h,
    Math.max(4, L.demand.h - L.closed.h)
  );
  const demandToJobs = ribbon(
    L.demand.x + L.demand.w,
    L.demand.y,
    L.demand.h,
    L.jobs.x,
    L.overflow ? L.overflow.y : L.jobs.y,
    L.jobs.h + (L.overflow?.h ?? 0)
  );
  const jobsToRev = vRibbon(L.jobs.x, L.jobs.y + L.jobs.h, L.jobs.w, L.revenue.x, L.revenue.y, L.revenue.w);
  const revToDisc = ribbon(
    L.revenue.x + L.revenue.w,
    L.revenue.y,
    L.revenue.h,
    L.disc.cx - L.disc.r - 8,
    L.disc.cy - Math.min(80, L.netBand.h) / 2,
    Math.min(80, Math.max(14, L.netBand.h))
  );

  const live = (id: StationId) => hot(id) || blocked(id);

  const pulses: { d: string; station: StationId; color: string }[] = [
    { d: spine(L.paid.x + L.paid.w, L.paid.y, L.paid.h, L.leads.x, L.leads.y, L.leadsPaidH), station: "leads", color: STATION_COLOR.leads },
    { d: spine(L.leads.x + L.leads.w, L.leads.y, L.leads.h, L.demand.x, L.closed.y, L.closed.h), station: "jobs", color: STATION_COLOR.jobs },
    {
      d: spine(
        L.demand.x + L.demand.w,
        L.demand.y,
        L.demand.h,
        L.jobs.x,
        L.overflow ? L.overflow.y : L.jobs.y,
        L.jobs.h + (L.overflow?.h ?? 0)
      ),
      station: "jobs",
      color: blocked("jobs") ? "var(--ink-loss)" : STATION_COLOR.jobs,
    },
    { d: vSpine(L.jobs.x, L.jobs.y + L.jobs.h, L.jobs.w, L.revenue.x, L.revenue.y, L.revenue.w), station: "revenue", color: STATION_COLOR.revenue },
    {
      d: spine(
        L.revenue.x + L.revenue.w,
        L.revenue.y,
        L.revenue.h,
        L.disc.cx - L.disc.r - 8,
        L.disc.cy - 20,
        40
      ),
      station: "profit",
      color: view.net < 0 ? "var(--ink-loss)" : STATION_COLOR.profit,
    },
  ];

  const firstHot = pulses.findIndex((p) => live(p.station));

  const costTotal = view.adSpend + view.materials + view.fixed;
  const vesselSpan = Math.max(view.revenue, view.expenses, 1);
  const vesselPx = L.disc.r * 2;
  const bottom = L.disc.cy + L.disc.r;
  const hOf = (v: number) => (v / vesselSpan) * vesselPx;
  const adsH = hOf(view.adSpend);
  const matVH = hOf(view.materials);
  const fixVH = hOf(view.fixed);
  const profitH = hOf(Math.max(0, view.net));
  const lossVH = hOf(Math.max(0, -view.net));
  const actualMeniscus = bottom - hOf(Math.max(0, actualView.expenses) + Math.max(0, actualView.net));
  const breakEvenY =
    view.contribution > 0 ? bottom - hOf(view.adSpend + view.fixed) : null;

  return (
    <div className="sim-organism">
    <div className="sim-plate">
      <svg
        ref={svgRef}
        className="sim-svg"
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <clipPath id="sim-vessel">
            <circle cx={L.disc.cx} cy={L.disc.cy} r={L.disc.r} />
          </clipPath>
          <pattern id="sim-hash" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink-loss)" strokeWidth="1.4" />
          </pattern>
        </defs>

        {/* Ghost of actual jobs tank */}
        <rect
          className="sim-ghost"
          x={G.tank.x}
          y={G.tank.y}
          width={G.tank.w}
          height={G.tank.h}
        />

        <path className="sim-wash" data-tone="lead" data-hot={hot("leads")} d={paidToLeads} />
        <path className="sim-wash" data-tone="lead" data-hot={hot("leads")} d={orgToLeads} />
        <path className="sim-wash" data-tone="work" data-hot={hot("jobs")} d={leadsToDemand} />
        <path className="sim-wash" data-tone="work" data-hot={hot("jobs")} d={repeatToDemand} />
        <path
          className="sim-wash"
          data-tone={blocked("jobs") ? "loss" : "work"}
          data-hot={live("jobs")}
          d={demandToJobs}
        />
        <path className="sim-wash" data-tone="cash" data-hot={hot("revenue")} d={jobsToRev} />
        <path
          className="sim-wash"
          data-tone={view.net < 0 ? "loss" : "yield"}
          data-hot={hot("profit")}
          d={revToDisc}
        />

        <rect className="sim-band" data-tone="heat" data-hot={hot("ads")} x={L.paid.x} y={L.paid.y} width={L.paid.w} height={L.paid.h} />
        <rect className="sim-band" data-tone="lead" data-hot={hot("leads")} x={L.organic.x} y={L.organic.y} width={L.organic.w} height={L.organic.h} />
        <rect className="sim-band" data-tone="lead" data-hot={hot("leads")} x={L.leads.x} y={L.leads.y} width={L.leads.w} height={L.leads.h} />
        <rect className="sim-band" data-tone="work" data-hot={hot("jobs")} x={L.repeat.x} y={L.repeat.y} width={L.repeat.w} height={L.repeat.h} />
        <rect className="sim-band" data-tone="work" data-hot={hot("jobs")} x={L.demand.x} y={L.demand.y} width={L.demand.w} height={L.demand.h} />

        <rect className="sim-tank" x={L.tank.x} y={L.tank.y} width={L.tank.w} height={L.tank.h} />
        <rect className="sim-band" data-tone="work" data-hot={hot("jobs")} x={L.jobs.x} y={L.jobs.y} width={L.jobs.w} height={L.jobs.h} />
        {L.overflow ? (
          <rect className="sim-overflow" x={L.overflow.x} y={L.overflow.y} width={L.overflow.w} height={L.overflow.h} fill="url(#sim-hash)" />
        ) : null}
        <line
          className="sim-cap-line"
          x1={L.tank.x - 10}
          x2={L.tank.x + L.tank.w + 10}
          y1={L.tank.y}
          y2={L.tank.y}
        />

        <rect className="sim-band" data-tone="cash" data-hot={hot("revenue")} x={L.revenue.x} y={L.revenue.y} width={L.revenue.w} height={L.revenue.h} />
        <rect className="sim-band" data-tone="heat" data-hot={hot("profit")} x={L.adsCost.x} y={L.adsCost.y} width={L.adsCost.w} height={L.adsCost.h} />
        <rect className="sim-band" data-tone="heat" data-hot={hot("profit")} x={L.materials.x} y={L.materials.y} width={L.materials.w} height={L.materials.h} />
        <rect className="sim-band" data-tone="heat" data-hot={hot("profit")} x={L.fixed.x} y={L.fixed.y} width={L.fixed.w} height={L.fixed.h} />

        {/* Vessel */}
        <circle className="sim-vessel-ring" cx={L.disc.cx} cy={L.disc.cy} r={L.disc.r} />
        <circle className="sim-vessel-ring inner" cx={L.disc.cx} cy={L.disc.cy} r={L.disc.r - 7} />
        <g clipPath="url(#sim-vessel)">
          <rect x={L.disc.cx - L.disc.r} y={bottom - adsH} width={vesselPx} height={adsH} fill="var(--ink-heat)" opacity="0.72" />
          <rect x={L.disc.cx - L.disc.r} y={bottom - adsH - matVH} width={vesselPx} height={matVH} fill="var(--ink-ember)" opacity="0.72" />
          <rect x={L.disc.cx - L.disc.r} y={bottom - adsH - matVH - fixVH} width={vesselPx} height={fixVH} fill="var(--ink-steel)" opacity="0.55" />
          {view.net >= 0 ? (
            <rect x={L.disc.cx - L.disc.r} y={bottom - adsH - matVH - fixVH - profitH} width={vesselPx} height={profitH} fill="var(--ink-yield)" opacity="0.82" />
          ) : (
            <rect x={L.disc.cx - L.disc.r} y={bottom - adsH - matVH - fixVH} width={vesselPx} height={lossVH} fill="url(#sim-hash)" opacity="0.9" />
          )}
          <line
            x1={L.disc.cx - L.disc.r}
            x2={L.disc.cx + L.disc.r}
            y1={actualMeniscus}
            y2={actualMeniscus}
            stroke="var(--ink)"
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity="0.45"
          />
        </g>
        {breakEvenY !== null ? (
          <line
            className="sim-be"
            x1={L.disc.cx + L.disc.r - 2}
            x2={L.disc.cx + L.disc.r + 16}
            y1={Math.min(L.disc.cy + L.disc.r - 4, Math.max(L.disc.cy - L.disc.r + 4, breakEvenY))}
            y2={Math.min(L.disc.cy + L.disc.r - 4, Math.max(L.disc.cy - L.disc.r + 4, breakEvenY))}
          />
        ) : null}

        {pulse
          ? pulses.map((p, i) => {
              if (!live(p.station)) return null;
              const delay = Math.max(0, i - Math.max(0, firstHot)) * 0.16;
              return (
                <g key={`${pulse.id}-${i}`}>
                  <circle r="3.5" fill={p.color} opacity="0">
                    <animateMotion dur="0.48s" begin={`${delay}s`} fill="freeze" path={p.d} />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.78;1" dur="0.48s" begin={`${delay}s`} fill="freeze" />
                  </circle>
                </g>
              );
            })
          : null}
      </svg>

      <div
        className="sim-overlay"
        style={{ left: fit.left, top: fit.top, width: fit.width, height: fit.height }}
      >
      {/* Node readouts */}
      <NodeMark
        id="ads"
        x={L.paid.x}
        y={L.paid.y}
        w={L.paid.w}
        kicker="Paid leads"
        value={num(view.adLeads, { decimals: 0 })}
        sub={`${money(view.adSpend)} ads`}
        chip={<DeltaChip value={view.adLeads} actual={actualView.adLeads} format={(v, o) => num(v, { ...o, decimals: 0 })} />}
        hot={hot("ads") || hot("leads")}
        inspect={inspect}
        onInspect={onInspect}
      />
      <NodeMark
        id="leads"
        x={L.organic.x}
        y={L.organic.y}
        w={L.organic.w}
        kicker="Organic"
        value={num(view.organicLeads, { decimals: 0 })}
        chip={<DeltaChip value={view.organicLeads} actual={actualView.organicLeads} format={(v, o) => num(v, { ...o, decimals: 0 })} />}
        hot={hot("leads")}
        inspect={inspect}
        onInspect={onInspect}
        attach="inside"
      />
      <NodeMark
        id="leads"
        x={L.leads.x}
        y={L.leads.y}
        w={L.leads.w}
        kicker="Leads"
        value={num(view.leads, { decimals: 0 })}
        chip={<DeltaChip value={view.leads} actual={actualView.leads} format={(v, o) => num(v, { ...o, decimals: 0 })} />}
        hot={hot("leads")}
        inspect={inspect}
        onInspect={onInspect}
      />
      <NodeMark
        id="jobs"
        x={L.repeat.x}
        y={L.repeat.y}
        w={L.repeat.w}
        kicker="Repeat"
        value={num(L.repeatCount, { decimals: 0 })}
        hot={hot("jobs")}
        inspect={inspect}
        onInspect={onInspect}
        attach="inside"
      />
      <NodeMark
        id="jobs"
        x={L.demand.x}
        y={L.demand.y}
        w={L.demand.w}
        kicker="Demand"
        value={num(view.demand, { decimals: 0 })}
        sub={`${num(view.capacity, { decimals: 0 })} cap`}
        chip={<DeltaChip value={view.demand} actual={actualView.demand} format={(v, o) => num(v, { ...o, decimals: 0 })} />}
        hot={hot("jobs")}
        inspect={inspect}
        onInspect={onInspect}
      />
      <NodeMark
        id="jobs"
        x={L.jobs.x}
        y={L.overflow ? L.overflow.y : L.jobs.y}
        w={L.jobs.w}
        kicker="Jobs"
        value={num(view.jobs, { decimals: 0 })}
        sub={
          view.turnedAway > 0.5
            ? `${num(view.turnedAway, { decimals: 0 })} turned away`
            : `${pctFmt(view.utilization)} of crew`
        }
        chip={
          view.turnedAway > 0.5 ? (
            <span className="sim-chip" data-dir="down">
              at capacity
            </span>
          ) : (
            <DeltaChip value={view.jobs} actual={actualView.jobs} format={(v, o) => num(v, { ...o, decimals: 0 })} />
          )
        }
        hot={live("jobs")}
        blocked={blocked("jobs")}
        inspect={inspect}
        onInspect={onInspect}
      />
      <NodeMark
        id="revenue"
        x={L.revenue.x}
        y={L.revenue.y}
        w={L.revenue.w}
        kicker="Revenue"
        value={money(view.revenue)}
        sub={`${num(view.hoursWorked, { decimals: 0 })}h on site`}
        chip={<DeltaChip value={view.revenue} actual={actualView.revenue} format={money} />}
        hot={hot("revenue")}
        inspect={inspect}
        onInspect={onInspect}
      />
      <div className="sim-cost-caption" style={pct(L.adsCost.x, L.adsCost.y + L.adsCost.h + L.materials.h + L.fixed.h + 8)}>
        <span>− costs {money(costTotal)}</span>
        <span>
          ads {money(view.adSpend, { compact: true })} · mat {money(view.materials, { compact: true })} · fix {money(view.fixed, { compact: true })}
        </span>
      </div>

      <div className="sim-op" style={pct((L.paid.x + L.paid.w + L.leads.x) / 2, (L.paid.y + L.organic.y) / 2)}>
        ÷ CPL
      </div>
      <div className="sim-op" style={pct((L.leads.x + L.leads.w + L.demand.x) / 2, L.leads.y + L.leads.h / 2)}>
        × close
      </div>
      <div className="sim-op" style={pct(L.jobs.x + L.jobs.w / 2, (L.jobs.y + L.jobs.h + L.revenue.y) / 2)}>
        × ticket
      </div>
      <div className="sim-op sim-op-cap" style={pct(L.tank.x + L.tank.w + 12, L.tank.y - 2)}>
        capacity
      </div>

      <Yield view={view} actual={actualView} cx={L.disc.cx} cy={L.disc.cy} />
      </div>
    </div>

    <div className="sim-rail">
      <div className="sim-rail-group" data-hot={hot("ads") || hot("leads")}>
        <span className="sim-kicker">Reach</span>
        {valve("adSpend", STATION_COLOR.ads, "/mo")}
        {valve("cpl", STATION_COLOR.leads)}
        {valve("organicLeads", STATION_COLOR.leads, "/mo")}
      </div>
      <div className="sim-rail-group" data-hot={hot("jobs")}>
        <span className="sim-kicker">Conversion</span>
        {valve("closeRate", STATION_COLOR.jobs)}
        {valve("repeatJobs", STATION_COLOR.jobs, "/mo")}
      </div>
      <div className="sim-rail-group" data-hot={hot("jobs")}>
        <span className="sim-kicker">Crew</span>
        {valve("workDays", STATION_COLOR.jobs, "/mo", true)}
        {valve("hoursPerDay", STATION_COLOR.jobs, undefined, true)}
        {valve("hoursPerJob", STATION_COLOR.jobs, undefined, true)}
      </div>
      <div className="sim-rail-group" data-hot={hot("revenue") || hot("profit")}>
        <span className="sim-kicker">Price &amp; cost</span>
        {valve("ticket", STATION_COLOR.revenue)}
        {valve("materialsPerJob", STATION_COLOR.profit)}
        {valve("fixedCosts", STATION_COLOR.profit, "/mo")}
      </div>
    </div>
    </div>
  );
}
