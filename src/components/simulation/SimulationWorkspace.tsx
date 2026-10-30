"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import "./simulation.css";
import Chamber, { NODE_STATION, type Pulse, type StationId } from "./Chamber";
import Horizon, { type MonthProjection } from "./Horizon";
import Insight, { type Cause } from "./Insight";
import { useTweened } from "./useTweened";
import {
  BASE_PERIODS,
  LEVERS,
  LEVER_BY_ID,
  SEASON_CURVE,
  actualMonths,
  basePeriodRange,
  deriveBaseline,
  futureMonths,
  money,
  num,
  runModel,
  trace,
  type Baseline,
  type BasePeriodId,
  type LeverId,
  type Levers,
} from "@/lib/simulation/model";
import type { Expense, Job, Lead } from "@/types";

const STORAGE_KEY = "gpw-sim-v1";

interface Stored {
  period: BasePeriodId;
  levers: Partial<Levers>;
  multipliers: Record<string, number>;
  season: boolean;
}

function readStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked. The scenario still works for this visit.
  }
}

function sameLevers(a: Levers, b: Levers) {
  return LEVERS.every((l) => Math.abs(a[l.id] - b[l.id]) <= l.step / 2);
}

function dateLabel(iso: string) {
  return format(new Date(`${iso}T12:00:00`), "MMM d");
}

function fallbackLevers(): Levers {
  return {
    adSpend: 0,
    cpl: 45,
    organicLeads: 0,
    closeRate: 0.3,
    repeatJobs: 0,
    workDays: 20,
    hoursPerDay: 8,
    hoursPerJob: 1.5,
    ticket: 450,
    materialsPerJob: 25,
    fixedCosts: 0,
  };
}

interface Data {
  jobs: Job[];
  expenses: Expense[];
  leads: Lead[];
}

export default function SimulationWorkspace() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<BasePeriodId>("month");
  const [levers, setLevers] = useState<Levers | null>(null);
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [season, setSeason] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [cause, setCause] = useState<Cause | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [inspect, setInspect] = useState<StationId | null>(null);
  const hydrated = useRef(false);
  const gesture = useRef<{ id: number; lever: LeverId; startLevers: Levers } | null>(null);
  const gestureCounter = useRef(0);

  const load = useCallback(() => {
    setError(null);
    let cancelled = false;
    Promise.all([
      fetch("/api/jobs", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Job[]>) : Promise.reject(new Error("jobs")))),
      fetch("/api/expenses", { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<Expense[]>) : Promise.reject(new Error("expenses"))
      ),
      fetch("/api/leads", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Lead[]>) : Promise.reject(new Error("leads")))),
    ])
      .then(([jobs, expenses, leads]) => {
        if (cancelled) return;
        setData({
          jobs: Array.isArray(jobs) ? jobs : [],
          expenses: Array.isArray(expenses) ? expenses : [],
          leads: Array.isArray(leads) ? leads : [],
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(`Could not load ${err.message}. The model needs the live books.`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  const baseline: Baseline | null = useMemo(() => {
    if (!data) return null;
    const { from, to } = basePeriodRange(period);
    return deriveBaseline(data.jobs, data.leads, data.expenses, from, to);
  }, [data, period]);

  useEffect(() => {
    if (!baseline || hydrated.current) return;
    hydrated.current = true;
    const stored = readStored();
    if (stored && stored.period && stored.period !== period) {
      setPeriod(stored.period);
      hydrated.current = false;
      return;
    }
    const next: Levers = { ...baseline.levers };
    if (stored?.levers) {
      for (const lever of LEVERS) {
        const v = stored.levers[lever.id];
        if (typeof v === "number" && Number.isFinite(v)) next[lever.id] = Math.min(lever.max, Math.max(lever.min, v));
      }
    }
    setLevers(next);
    if (stored?.multipliers) setMultipliers(stored.multipliers);
    if (stored?.season) setSeason(true);
  }, [baseline, period]);

  const previousBaseline = useRef<Baseline | null>(null);
  useEffect(() => {
    if (!baseline) return;
    const prev = previousBaseline.current;
    previousBaseline.current = baseline;
    if (!prev || prev === baseline || prev.from === baseline.from) return;
    setLevers((current) => {
      if (!current) return current;
      const next: Levers = { ...current };
      for (const lever of LEVERS) {
        if (Math.abs(current[lever.id] - prev.levers[lever.id]) <= lever.step / 2) next[lever.id] = baseline.levers[lever.id];
      }
      return next;
    });
    setCause(null);
    setPulse(null);
  }, [baseline]);

  useEffect(() => {
    if (!levers || !hydrated.current) return;
    writeStored({ period, levers, multipliers, season });
  }, [period, levers, multipliers, season]);

  const future = useMemo(() => futureMonths(12), []);
  const history = useMemo(() => (data ? actualMonths(data.jobs, data.expenses, 3) : []), [data]);

  const multiplierFor = useCallback(
    (key: string, month: number) => multipliers[key] ?? (season ? SEASON_CURVE[month] : 1),
    [multipliers, season]
  );

  const focusMonth = focus ? future.find((m) => m.key === focus) ?? null : null;
  const focusMultiplier = focusMonth ? multiplierFor(focusMonth.key, focusMonth.month) : 1;

  const activeLevers = levers ?? baseline?.levers ?? null;
  const outputs = useMemo(
    () => (activeLevers ? runModel(activeLevers, focusMultiplier) : null),
    [activeLevers, focusMultiplier]
  );
  const actual = useMemo(() => (baseline ? runModel(baseline.levers, focusMultiplier) : null), [baseline, focusMultiplier]);

  const projection: MonthProjection[] = useMemo(() => {
    if (!activeLevers || !baseline) return [];
    return future.map((m) => {
      const mult = multiplierFor(m.key, m.month);
      const o = runModel(activeLevers, mult);
      const g = runModel(baseline.levers, mult);
      return { key: m.key, revenue: o.revenue, net: o.net, jobs: o.jobs, ghostNet: g.net, multiplier: mult };
    });
  }, [activeLevers, baseline, future, multiplierFor]);

  const tweenTarget = useMemo(() => outputs ?? runModel(fallbackLevers(), 1), [outputs]);
  const actualTweenTarget = useMemo(() => actual ?? runModel(fallbackLevers(), 1), [actual]);
  const view = useTweened(tweenTarget);
  const actualView = useTweened(actualTweenTarget);

  const handleLeverBegin = useCallback(
    (id: LeverId) => {
      if (!activeLevers) return;
      gestureCounter.current += 1;
      gesture.current = { id: gestureCounter.current, lever: id, startLevers: { ...activeLevers } };
    },
    [activeLevers]
  );

  const handleLeverEnd = useCallback(() => {
    gesture.current = null;
  }, []);

  const handleLever = useCallback(
    (id: LeverId, value: number) => {
      if (!activeLevers) return;
      const next: Levers = { ...activeLevers, [id]: value };
      const g = gesture.current && gesture.current.lever === id ? gesture.current : null;
      const startLevers = g ? g.startLevers : activeLevers;
      const before = runModel(startLevers, focusMultiplier);
      const after = runModel(next, focusMultiplier);
      const steps = trace(id, before, after, next, focusMultiplier);
      const gestureId = g ? g.id : ++gestureCounter.current;

      const hot = new Set<StationId>();
      let blocked: StationId | null = null;
      for (const step of steps) {
        if (step.blocked) blocked = NODE_STATION[step.node];
        else hot.add(NODE_STATION[step.node]);
      }
      setLevers(next);
      setCause({ id: gestureId, lever: id, from: startLevers[id], to: value, steps });
      setPulse((prev) => (prev && prev.id === gestureId ? { ...prev, hot, blocked } : { id: gestureId, hot, blocked }));
    },
    [activeLevers, focusMultiplier]
  );

  const reset = () => {
    if (!baseline) return;
    setLevers({ ...baseline.levers });
    setMultipliers({});
    setSeason(false);
    setFocus(null);
    setCause(null);
    setPulse(null);
    setInspect(null);
  };

  const toggleSeason = () => {
    if (season) {
      setSeason(false);
      setMultipliers({});
    } else {
      setSeason(true);
      const next: Record<string, number> = {};
      for (const m of future) next[m.key] = SEASON_CURVE[m.month];
      setMultipliers(next);
    }
  };

  const dirty =
    Boolean(baseline && activeLevers && !sameLevers(activeLevers, baseline.levers)) ||
    Object.keys(multipliers).length > 0 ||
    season ||
    focus !== null;

  return (
    <div className="sim" data-tap-ignore>
      <div className="sim-frame">
        <header className="sim-chrome">
          <Link href="/dashboard" className="sim-back">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 3 5 8l5 5" />
            </svg>
            Reports
          </Link>
          <div className="sim-brand">
            <strong>Model</strong>
            <span>a plate of the business</span>
          </div>
          {outputs ? (
            <div className="sim-chrome-yield" data-neg={view.perOwner < -0.5}>
              <b>{money(view.perOwner)}</b>
              <span>each owner · month</span>
            </div>
          ) : null}
          <div className="sim-chrome-space" />
          <div className="sim-cal" role="group" aria-label="Calibrate on">
            {BASE_PERIODS.map((p) => (
              <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="sim-textbtn" data-kind="reset" onClick={reset} disabled={!dirty}>
            Back to actual
          </button>
        </header>

        {error ? (
          <div className="sim-loading">
            <p>{error}</p>
            <button type="button" className="sim-textbtn" onClick={load}>
              Try again
            </button>
          </div>
        ) : !data || !baseline || !activeLevers || !outputs || !actual ? (
          <div className="sim-loading">
            <div className="sim-loading-ring" />
            Calibrating on the live books
          </div>
        ) : (
          <>
            <div className="sim-stage">
              {focusMonth ? (
                <div className="sim-head-focus">
                  <b>
                    {format(new Date(focusMonth.year, focusMonth.month, 1), "MMMM yyyy")} · demand ×
                    {focusMultiplier.toFixed(2)}
                  </b>
                  <button type="button" onClick={() => setFocus(null)}>
                    back to a typical month
                  </button>
                </div>
              ) : null}
              <Chamber
                levers={activeLevers}
                actualLevers={baseline.levers}
                view={view}
                actualView={actualView}
                pulse={pulse}
                inspect={inspect}
                onInspect={(id) => setInspect((prev) => (prev === id ? null : id))}
                onLever={handleLever}
                onLeverBegin={handleLeverBegin}
                onLeverEnd={handleLeverEnd}
              />
            </div>

            <Insight cause={cause} inspect={inspect} levers={activeLevers} outputs={outputs} actual={actual} />

            <Horizon
              history={history}
              future={future}
              projection={projection}
              focus={focus}
              season={season}
              onFocus={setFocus}
              onMultiplier={(key, value) => setMultipliers((prev) => ({ ...prev, [key]: value }))}
              onToggleSeason={toggleSeason}
            />

            <p className="sim-note">
              <b>Fig. 1 — monthly mechanics.</b> Calibrated on {dateLabel(baseline.from)}–{dateLabel(baseline.to)} (
              {baseline.days} days, scaled to a {Math.round(30.44)}-day month): {baseline.facts.jobs} jobs,{" "}
              {money(baseline.facts.gross)} gross, {money(baseline.facts.expenses)} of expenses, {baseline.facts.leads} inquiries (
              {baseline.facts.adLeads} from ads), {baseline.facts.firstTimeJobs} first-time houses and {baseline.facts.repeatJobs}{" "}
              repeat, {baseline.facts.workDays} work days averaging {num(baseline.facts.hoursPerWorkDay, { decimals: 1 })}h on site.
              Close rate is first-time houses over inquiries.
              {baseline.assumed.length > 0 ? (
                <>
                  {" "}
                  Assumed rather than measured: {baseline.assumed.map((id) => LEVER_BY_ID[id].label.toLowerCase()).join(", ")}.
                </>
              ) : null}{" "}
              Drag a future month to shape demand. Shift-drag a valve for fine control; double-click its number to type.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
