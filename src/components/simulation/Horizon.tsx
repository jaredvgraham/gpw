"use client";

import { useRef, useState, type PointerEvent } from "react";
import { money, num, type FutureMonth, type HistoryMonth } from "@/lib/simulation/model";

export interface MonthProjection {
  key: string;
  revenue: number;
  net: number;
  jobs: number;
  ghostNet: number;
  multiplier: number;
}

interface HorizonProps {
  history: HistoryMonth[];
  future: FutureMonth[];
  projection: MonthProjection[];
  focus: string | null;
  season: boolean;
  onFocus: (key: string | null) => void;
  onMultiplier: (key: string, value: number) => void;
  onToggleSeason: () => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function areaPath(xs: number[], ys: number[], baseline: number): string {
  if (xs.length === 0) return "";
  const top = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return `${top} L${xs[xs.length - 1].toFixed(1)},${baseline.toFixed(1)} L${xs[0].toFixed(1)},${baseline.toFixed(1)} Z`;
}

function linePath(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
}

export default function Horizon({
  history,
  future,
  projection,
  focus,
  season,
  onFocus,
  onMultiplier,
  onToggleSeason,
}: HorizonProps) {
  const [drag, setDrag] = useState<string | null>(null);
  const dragState = useRef<{ key: string; startY: number; startMult: number; moved: boolean } | null>(null);

  const W = 1200;
  const H = 132;
  const padT = 18;
  const padB = 28;
  const plotH = H - padT - padB;

  const pastN = history.length;
  const futureN = future.length;
  const cols = pastN + 1 + futureN;
  const colW = W / cols;
  const nowX = (pastN + 0.5) * colW;

  const top = Math.max(1, ...history.map((m) => m.revenue), ...projection.map((m) => m.revenue));
  const bottom = Math.min(0, ...history.map((m) => m.net), ...projection.map((m) => m.net));
  const span = top - bottom || 1;
  const yOf = (v: number) => padT + ((top - v) / span) * plotH;
  const zeroY = yOf(0);

  const futureXs = future.map((_, i) => nowX + (i + 0.5) * colW);
  const revYs = projection.map((m) => yOf(m.revenue));
  const netYs = projection.map((m) => yOf(m.net));
  const ghostYs = projection.map((m) => yOf(m.ghostNet));

  const total = projection.reduce((sum, m) => sum + m.net, 0);
  const ghostTotal = projection.reduce((sum, m) => sum + m.ghostNet, 0);
  const totalRevenue = projection.reduce((sum, m) => sum + m.revenue, 0);
  const totalJobs = projection.reduce((sum, m) => sum + m.jobs, 0);
  const lossMonths = projection.filter((m) => m.net < -0.5).length;
  const best = projection.reduce((a, b) => (b.net > a.net ? b : a), projection[0]);

  const handleDown = (event: PointerEvent<HTMLDivElement>, month: MonthProjection) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { key: month.key, startY: event.clientY, startMult: month.multiplier, moved: false };
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state) return;
    const dy = state.startY - event.clientY;
    if (!state.moved && Math.abs(dy) < 4) return;
    if (!state.moved) {
      state.moved = true;
      setDrag(state.key);
    }
    const next = clamp(state.startMult + dy / 110, 0, 2);
    onMultiplier(state.key, Math.round(next * 20) / 20);
  };

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!state.moved) onFocus(focus === state.key ? null : state.key);
    dragState.current = null;
    setDrag(null);
  };

  return (
    <div className="horizon" data-season={season}>
      <div className="horizon-head">
        <span className="sim-kicker">Next twelve months</span>
        <div className="horizon-legend">
          <span>
            <i data-swatch="cash" />
            revenue
          </span>
          <span>
            <i data-swatch="yield" />
            net
          </span>
          <span>
            <i data-swatch="ghost" />
            actual valves
          </span>
        </div>
        <button type="button" className="sim-textbtn" aria-pressed={season} onClick={onToggleSeason}>
          Seasonality <em>{season ? "New England" : "off"}</em>
        </button>
      </div>

      <div className="horizon-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          <line x1="0" x2={W} y1={zeroY} y2={zeroY} className="horizon-zero" />
          <line x1={nowX} x2={nowX} y1={padT} y2={H - padB} className="horizon-now" />
          {history.map((m, i) => {
            const x = (i + 0.5) * colW;
            return (
              <g key={m.key} opacity="0.35">
                <rect x={x - colW * 0.18} y={yOf(m.revenue)} width={colW * 0.36} height={Math.max(0, zeroY - yOf(m.revenue))} fill="var(--ink-cash)" />
                <rect
                  x={x - colW * 0.08}
                  y={m.net >= 0 ? yOf(m.net) : zeroY}
                  width={colW * 0.16}
                  height={Math.abs(yOf(m.net) - zeroY)}
                  fill={m.net < 0 ? "var(--ink-loss)" : "var(--ink-yield)"}
                />
              </g>
            );
          })}
          {futureXs.length > 1 ? (
            <>
              <path d={areaPath(futureXs, revYs, zeroY)} className="horizon-rev" />
              <path d={linePath(futureXs, ghostYs)} className="horizon-ghost" />
              <path d={linePath(futureXs, netYs)} className="horizon-net" />
            </>
          ) : null}
        </svg>

        <div className="horizon-cols" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {history.map((m) => (
            <div key={m.key} className="horizon-col" data-past="true">
              <span className="horizon-lab">{m.label}</span>
            </div>
          ))}
          <div className="horizon-col horizon-nowlab">
            <span className="horizon-lab">now</span>
          </div>
          {future.map((fm, i) => {
            const m = projection[i];
            if (!m) return null;
            return (
              <div
                key={fm.key}
                className="horizon-col"
                data-future="true"
                data-focus={focus === fm.key}
                data-drag={drag === fm.key}
                role="button"
                tabIndex={0}
                aria-label={`${fm.label} ${fm.year}: demand ×${m.multiplier.toFixed(2)}, net ${money(m.net)}`}
                onPointerDown={(event) => handleDown(event, m)}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp") onMultiplier(fm.key, clamp(m.multiplier + 0.05, 0, 2));
                  if (event.key === "ArrowDown") onMultiplier(fm.key, clamp(m.multiplier - 0.05, 0, 2));
                  if (event.key === "Enter" || event.key === " ") onFocus(focus === fm.key ? null : fm.key);
                }}
              >
                <span className="horizon-mult">×{m.multiplier.toFixed(2)}</span>
                <span className="horizon-lab">
                  {fm.label}
                  {fm.month === 0 ? ` ’${String(fm.year).slice(2)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="horizon-foot">
        <div>
          <span className="sim-kicker">12-month net</span>
          <b data-neg={total < 0}>
            {money(total)}
            <small>{Math.abs(total - ghostTotal) > 1 ? `${money(total - ghostTotal, { sign: true })} vs actual` : "same as actual"}</small>
          </b>
        </div>
        <div>
          <span className="sim-kicker">Each owner</span>
          <b data-neg={total < 0}>{money(total / 2)}</b>
        </div>
        <div>
          <span className="sim-kicker">Revenue</span>
          <b>{money(totalRevenue)}</b>
        </div>
        <div>
          <span className="sim-kicker">Jobs</span>
          <b>{num(totalJobs, { decimals: 0 })}</b>
        </div>
        {best ? (
          <div>
            <span className="sim-kicker">Best month</span>
            <b>
              {future.find((f) => f.key === best.key)?.label ?? ""}
              <small>{money(best.net)}</small>
            </b>
          </div>
        ) : null}
        <div>
          <span className="sim-kicker">Loss months</span>
          <b data-neg={lossMonths > 0}>{lossMonths}</b>
        </div>
      </div>
    </div>
  );
}
