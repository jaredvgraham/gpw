"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { formatKind, type LeverMeta } from "@/lib/simulation/model";

interface ValveProps {
  meta: LeverMeta;
  value: number;
  actual: number;
  accent: string;
  onChange: (id: LeverMeta["id"], value: number) => void;
  onBegin?: (id: LeverMeta["id"]) => void;
  onEnd?: (id: LeverMeta["id"]) => void;
  unit?: string;
  compact?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, step: number, min: number) {
  return Number((min + Math.round((value - min) / step) * step).toFixed(4));
}

/**
 * A precision instrument. Drag the rule to set a value, Shift for fine
 * control, arrows to step, double-click the number to type. The tick on the
 * rule is where the business actually ran.
 */
export default function Valve({ meta, value, actual, accent, onChange, onBegin, onEnd, unit, compact }: ValveProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    []
  );

  const range = meta.max - meta.min;
  const pos = clamp(((value - meta.min) / range) * 100, 0, 100);
  const actualPos = clamp(((actual - meta.min) / range) * 100, 0, 100);
  const changed = Math.abs(value - actual) > meta.step / 2;

  const setFromClientX = (clientX: number, fine: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    let next = meta.min + ratio * range;
    if (fine) next = value + (next - value) * 0.1;
    onChange(meta.id, snap(clamp(next, meta.min, meta.max), fine ? meta.step / 2 : meta.step, meta.min));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    track.setPointerCapture(event.pointerId);
    setActive(true);
    onBegin?.(meta.id);
    setFromClientX(event.clientX, event.shiftKey);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    setFromClientX(event.clientX, event.shiftKey);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    const track = trackRef.current;
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    setActive(false);
    onEnd?.(meta.id);
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    let delta = 0;
    const big = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") delta = meta.step * big;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") delta = -meta.step * big;
    if (event.key === "Home") {
      onChange(meta.id, meta.min);
      event.preventDefault();
      return;
    }
    if (event.key === "End") {
      onChange(meta.id, meta.max);
      event.preventDefault();
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      onChange(meta.id, actual);
      event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      beginEdit();
      event.preventDefault();
      return;
    }
    if (delta !== 0) {
      event.preventDefault();
      onBegin?.(meta.id);
      onChange(meta.id, snap(clamp(value + delta, meta.min, meta.max), meta.step, meta.min));
      onEnd?.(meta.id);
    }
  };

  const beginEdit = () => {
    const raw = meta.kind === "percent" ? String(Math.round(value * 1000) / 10) : String(Number(value.toFixed(2)));
    setDraft(raw);
    setEditing(true);
  };

  const commitEdit = () => {
    const parsed = Number(draft.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(parsed)) {
      const next = meta.kind === "percent" ? parsed / 100 : parsed;
      onBegin?.(meta.id);
      onChange(meta.id, snap(clamp(next, meta.min, meta.max), meta.step, meta.min));
      onEnd?.(meta.id);
    }
    setEditing(false);
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const style = { "--accent": accent } as CSSProperties;

  return (
    <div
      className="valve"
      style={style}
      data-active={active}
      data-changed={changed}
      data-compact={compact ?? false}
      tabIndex={0}
      role="slider"
      aria-label={meta.label}
      aria-valuemin={meta.min}
      aria-valuemax={meta.max}
      aria-valuenow={value}
      aria-valuetext={formatKind(meta.kind, value)}
      onKeyDown={handleKey}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        hoverTimer.current = window.setTimeout(() => setHint(true), 500);
      }}
      onPointerLeave={() => {
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
        setHint(false);
      }}
    >
      <div className="valve-head">
        <span className="valve-label">{meta.short}</span>
        {editing ? (
          <input
            ref={inputRef}
            className="valve-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitEdit();
              if (event.key === "Escape") setEditing(false);
              event.stopPropagation();
            }}
            inputMode="decimal"
          />
        ) : (
          <span className="valve-value" onDoubleClick={beginEdit} title="Double-click to type">
            {formatKind(meta.kind, value)}
            {unit ? <small>{unit}</small> : null}
          </span>
        )}
      </div>
      <div
        ref={trackRef}
        className="valve-track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="valve-rule" />
        <div className="valve-fill" style={{ width: `${pos}%` }} />
        <div className="valve-actual" style={{ left: `${actualPos}%` }} />
        <div className="valve-thumb" style={{ left: `${pos}%` }} />
      </div>
      {changed ? <span className="valve-delta">{formatKind(meta.kind, value - actual, { sign: true })}</span> : null}
      {hint && !active && !editing ? <div className="valve-hint">{meta.hint}</div> : null}
    </div>
  );
}
