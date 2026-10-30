"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Eases every numeric field of `target` toward its new value frame by frame.
 * All geometry and readouts derive from the eased object, so a dial change
 * moves the whole model together instead of snapping.
 */
export function useTweened<T extends { [K in keyof T]: number | null }>(target: T, stiffness = 0.22): T {
  const [current, setCurrent] = useState<T>(target);
  const currentRef = useRef<T>(target);
  const targetRef = useRef<T>(target);
  const frameRef = useRef<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    targetRef.current = target;

    if (reduced.current) {
      currentRef.current = target;
      setCurrent(target);
      return;
    }

    if (frameRef.current !== null) return;

    const step = () => {
      const from = currentRef.current;
      const to = targetRef.current;
      const next = { ...from };
      let settled = true;

      for (const key of Object.keys(to) as (keyof T)[]) {
        const t = to[key];
        const f = from[key];
        if (t === null || f === null || f === undefined || typeof t !== "number" || typeof f !== "number" || !Number.isFinite(t) || !Number.isFinite(f)) {
          next[key] = t;
          continue;
        }
        const diff = t - f;
        const scale = Math.max(1, Math.abs(t));
        if (Math.abs(diff) < scale * 0.0005) {
          next[key] = t;
        } else {
          next[key] = (f + diff * stiffness) as T[keyof T];
          settled = false;
        }
      }

      currentRef.current = next;
      setCurrent(next);

      if (settled) {
        frameRef.current = null;
      } else {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
  }, [target, stiffness]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  return current;
}
