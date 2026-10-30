"use client";

import { money, type Outputs } from "@/lib/simulation/model";
import { VB } from "./geometry";

interface YieldProps {
  view: Outputs;
  actual: Outputs;
  cx: number;
  cy: number;
}

function tone(diff: number): "up" | "down" | undefined {
  if (diff > 0.5) return "up";
  if (diff < -0.5) return "down";
  return undefined;
}

export default function Yield({ view, actual, cx, cy }: YieldProps) {
  const delta = view.perOwner - actual.perOwner;
  const loss = view.net < -0.5;

  return (
    <div
      className="sim-yield"
      data-neg={loss}
      style={{ left: `${(cx / VB.w) * 100}%`, top: `${(cy / VB.h) * 100}%` }}
    >
      <div className="sim-yield-delta" data-dir={tone(delta)}>
        {Math.abs(delta) > 0.5 ? `${money(delta, { sign: true })} vs actual` : "as the books ran"}
      </div>
      <div className="sim-yield-split">
        <span>
          Jared
          <b>{money(view.perOwner)}</b>
        </span>
        <i />
        <span>
          Justin
          <b>{money(view.perOwner)}</b>
        </span>
      </div>
    </div>
  );
}
