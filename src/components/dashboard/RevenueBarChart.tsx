"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { RevenuePoint } from "@/lib/dashboard-stats";

const CHART_HEIGHT = 240;

interface RevenueBarChartProps {
  data: RevenuePoint[];
  highlightKey?: string;
  onBarClick?: (point: RevenuePoint) => void;
  emptyMessage?: string;
  showShortLabels?: boolean;
  singleBar?: boolean;
}

function formatAxisValue(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  if (value > 0) return `$${Math.round(value)}`;
  return "$0";
}

function barHeight(value: number, maxValue: number): number {
  if (value <= 0) return 0;
  return Math.max(4, Math.round((value / maxValue) * CHART_HEIGHT));
}

function BarTooltip({ point }: { point: RevenuePoint }) {
  return (
    <div className="rounded-lg border border-brand-border bg-white px-2.5 py-2 text-xs shadow-lg">
      <p className="font-semibold text-brand-black">{point.label}</p>
      <p className="text-brand-red font-bold">{formatCurrency(point.revenue)}</p>
      <p className="text-gray-500 mt-0.5">{formatCurrency(point.collected)} collected</p>
      <p className="text-gray-400">
        {point.jobs} job{point.jobs !== 1 ? "s" : ""}
        {point.workingDays ? ` · ${point.workingDays} work day${point.workingDays !== 1 ? "s" : ""}` : ""}
      </p>
    </div>
  );
}

export default function RevenueBarChart({
  data,
  highlightKey,
  onBarClick,
  emptyMessage = "No revenue in this period.",
  showShortLabels = false,
  singleBar = true,
}: RevenueBarChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gray text-lg text-gray-400">
          ∅
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.revenue), 1);
  const yTicks = [0, 0.5, 1].map((ratio) => Math.round(maxValue * ratio));
  const uniqueTicks = [...new Set(yTicks)].sort((a, b) => a - b);
  const isWideChart = data.length > 6;
  const columnMinWidth =
    data.length === 12 ? 40 : data.length === 4 ? 56 : data.length <= 5 ? 48 : 40;

  const handleBarClick = (point: RevenuePoint) => {
    if (onBarClick) {
      onBarClick(point);
      return;
    }
    setActiveKey((current) => (current === point.key ? null : point.key));
  };

  return (
    <div className="w-full">
      {onBarClick && (
        <p className="mb-3 text-xs text-gray-400">Tap any bar to drill into that period</p>
      )}

      <div className="flex gap-2 sm:gap-3">
        <div
          className="flex shrink-0 w-9 sm:w-10 flex-col justify-between text-right text-[10px] text-gray-400"
          style={{ height: CHART_HEIGHT }}
        >
          {[...uniqueTicks].reverse().map((tick) => (
            <span key={tick}>{formatAxisValue(tick)}</span>
          ))}
        </div>

        <div className={`min-w-0 flex-1 ${isWideChart ? "overflow-x-auto pb-1" : ""}`}>
          <div
            className={isWideChart ? "min-w-max" : "w-full"}
            style={{ minWidth: isWideChart ? columnMinWidth * data.length : undefined }}
          >
            <div
              className="relative rounded-lg border border-brand-border/60 bg-brand-gray/40"
              style={{ height: CHART_HEIGHT }}
            >
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-1">
                {uniqueTicks.map((tick) => (
                  <div key={tick} className="border-t border-dashed border-brand-border/60" />
                ))}
              </div>

              <div
                className="absolute inset-x-1 bottom-0 grid items-end"
                style={{
                  height: CHART_HEIGHT,
                  gridTemplateColumns: `repeat(${data.length}, minmax(${columnMinWidth}px, 1fr))`,
                  columnGap: data.length <= 5 ? 8 : 4,
                }}
              >
                {data.map((point) => {
                  const revenuePx = barHeight(point.revenue, maxValue);
                  const isHighlighted = highlightKey === point.key;
                  const isActive = activeKey === point.key;
                  const isClickable = Boolean(onBarClick) || point.revenue > 0;
                  const showValue = revenuePx > 28 && point.revenue > 0;

                  return (
                    <div
                      key={point.key}
                      className="relative flex h-full flex-col items-center justify-end"
                    >
                      {!onBarClick && isActive && (
                        <div className="absolute bottom-full z-20 mb-2 w-max max-w-[160px]">
                          <BarTooltip point={point} />
                        </div>
                      )}

                      {!onBarClick && (
                        <div className="pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max max-w-[160px] group-hover/bar:block">
                          <BarTooltip point={point} />
                        </div>
                      )}

                      {onBarClick && (
                        <div className="pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max max-w-[160px] group-hover/bar:block">
                          <BarTooltip point={point} />
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={!isClickable}
                        onClick={() => isClickable && handleBarClick(point)}
                        className={`group/bar relative flex w-full flex-col items-center justify-end transition-transform ${
                          isClickable ? "cursor-pointer active:scale-95" : "cursor-default"
                        }`}
                        style={{ height: CHART_HEIGHT, background: "none", border: "none", padding: 0 }}
                        aria-label={`${point.label}: ${formatCurrency(point.revenue)}`}
                      >
                        {showValue && (
                          <span className="mb-1 text-[9px] font-semibold text-gray-500 sm:text-[10px]">
                            {formatAxisValue(point.revenue)}
                          </span>
                        )}
                        <div
                          className={`rounded-t-md transition-all duration-200 ${
                            isHighlighted
                              ? "bg-brand-red shadow-sm shadow-red-200"
                              : isActive
                                ? "bg-brand-blue shadow-sm shadow-blue-200"
                                : "bg-brand-blue/85 group-hover/bar:bg-brand-blue"
                          }`}
                          style={{
                            width: "68%",
                            height: revenuePx,
                            minHeight: point.revenue > 0 ? 4 : 0,
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="mt-2.5 grid text-center text-[10px] font-medium text-gray-500 sm:text-xs"
              style={{
                gridTemplateColumns: `repeat(${data.length}, minmax(${columnMinWidth}px, 1fr))`,
                columnGap: data.length <= 5 ? 8 : 4,
              }}
            >
              {data.map((point) => {
                const isHighlighted = highlightKey === point.key;
                return (
                  <span
                    key={point.key}
                    className={`truncate px-0.5 ${isHighlighted ? "font-semibold text-brand-red" : ""}`}
                    title={point.label}
                  >
                    {showShortLabels ? point.shortLabel : point.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
