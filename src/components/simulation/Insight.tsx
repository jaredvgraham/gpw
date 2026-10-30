"use client";

import type { CSSProperties } from "react";
import {
  LEVER_BY_ID,
  NODE_KIND,
  NODE_LABEL,
  formatKind,
  money,
  num,
  pct,
  type LeverId,
  type Levers,
  type Outputs,
  type TraceStep,
} from "@/lib/simulation/model";
import { NODE_STATION, STATION_COLOR, type StationId } from "./Chamber";

export interface Cause {
  id: number;
  lever: LeverId;
  from: number;
  to: number;
  steps: TraceStep[];
}

interface InsightProps {
  cause: Cause | null;
  inspect: StationId | null;
  levers: Levers;
  outputs: Outputs;
  actual: Outputs;
}

function dir(diff: number, eps = 0.5): "up" | "down" | "flat" {
  if (diff > eps) return "up";
  if (diff < -eps) return "down";
  return "flat";
}

const INSPECT_COPY: Record<StationId, (o: Outputs, l: Levers) => string> = {
  ads: (o, l) => `${money(l.adSpend)} of ads buys inquiries at ${money(l.cpl)} each → ${formatKind("count", o.adLeads)} paid leads.`,
  leads: (o) => `${formatKind("count", o.adLeads)} paid and ${formatKind("count", o.organicLeads)} organic arrive this month.`,
  jobs: (o, l) =>
    o.turnedAway > 0.5
      ? `${formatKind("count", o.demand)} jobs wanted, crew fits ${formatKind("count", o.capacity)}. ${formatKind("count", o.turnedAway)} turned away.`
      : `${formatKind("count", o.leads)} leads × ${formatKind("percent", l.closeRate)} close, plus repeats, all fit in ${formatKind("count", o.capacity)} of capacity.`,
  revenue: (o, l) => `${formatKind("count", o.jobs)} jobs × ${money(l.ticket)} = ${money(o.revenue)}.`,
  profit: (o) =>
    `${money(o.revenue)} in − ${money(o.expenses)} out = ${money(o.net)}. Split two ways, ${money(o.perOwner)} each.`,
};

export default function Insight({ cause, inspect, levers, outputs, actual }: InsightProps) {
  const leverMeta = cause ? LEVER_BY_ID[cause.lever] : null;
  const netStep = cause?.steps.find((s) => s.node === "net");
  const netDiff = netStep ? netStep.after - netStep.before : 0;
  const verdict = dir(netDiff);

  return (
    <div className="sim-insight">
      {cause && leverMeta ? (
        <div key={cause.id} className="sim-insight-live">
          <div className="sim-insight-cause">
            <span>
              {leverMeta.label} <em>moved</em>
            </span>
            <b>
              {formatKind(leverMeta.kind, cause.from)} → {formatKind(leverMeta.kind, cause.to)}
            </b>
          </div>
          {cause.steps.length === 0 ? (
            <p className="sim-insight-empty">Nothing downstream moved enough to register this month.</p>
          ) : (
            <ol className="sim-path">
              {cause.steps.map((step, i) => {
                const kind = NODE_KIND[step.node];
                const diff = step.after - step.before;
                const d = step.blocked ? "flat" : dir(diff, kind === "money" ? 0.5 : 0.05);
                const station = NODE_STATION[step.node];
                return (
                  <li
                    key={step.node}
                    className="sim-path-step"
                    data-blocked={step.blocked ?? false}
                    style={{ "--i": i, "--dot": STATION_COLOR[station] } as CSSProperties}
                  >
                    <span className="sim-path-name">{NODE_LABEL[step.node]}</span>
                    <span className="sim-path-val">
                      {formatKind(kind, step.after)}
                      {d !== "flat" ? (
                        <b data-dir={d}>{formatKind(kind, diff, { sign: true })}</b>
                      ) : (
                        <b data-dir="flat">{step.blocked ? "blocked" : "unchanged"}</b>
                      )}
                    </span>
                    <span className="sim-path-why">{step.reason}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {netStep ? (
            <div className="sim-verdict" data-dir={verdict}>
              {verdict === "up" ? "Better." : verdict === "down" ? "Worse." : "No change."} Each owner{" "}
              {verdict === "flat" ? "keeps" : verdict === "up" ? "gains" : "loses"} {money(Math.abs(netDiff) / 2)} / mo.
            </div>
          ) : cause.steps.some((s) => s.blocked) ? (
            <div className="sim-verdict" data-dir="flat">
              No change in profit. The crew is already full.
            </div>
          ) : null}
        </div>
      ) : inspect ? (
        <p className="sim-insight-copy">{INSPECT_COPY[inspect](outputs, levers)}</p>
      ) : (
        <>
          <p className="sim-insight-copy">
            Turn a valve. Ink travels through the business — what moved, by how much, and why — and whether you ended
            up better or worse.
          </p>
          <p className="sim-insight-reads">
            {outputs.turnedAway > 0.5
              ? `Crew-bound · ${num(outputs.turnedAway, { decimals: 0 })} turned away`
              : `${pct(outputs.utilization)} of crew used`}
            {" · "}
            next $100 ads {money(outputs.marginalPer100, { sign: true })}
            {" · "}
            break-even{" "}
            {Number.isFinite(outputs.breakEvenJobs) ? `${num(outputs.breakEvenJobs, { decimals: 0 })} jobs` : "never"}
            {Math.abs(outputs.net - actual.net) > 0.5
              ? ` · ${money(outputs.net - actual.net, { sign: true })} / mo vs actual`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}
