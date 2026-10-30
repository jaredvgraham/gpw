export const VB = { w: 1400, h: 640 } as const;

export function ribbon(
  x0: number,
  y0: number,
  h0: number,
  x1: number,
  y1: number,
  h1: number
): string {
  const mx = (x0 + x1) / 2;
  const a = Math.max(h0, 1.2);
  const b = Math.max(h1, 1.2);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} L${x1.toFixed(1)},${(y1 + b).toFixed(1)} C${mx.toFixed(1)},${(y1 + b).toFixed(1)} ${mx.toFixed(1)},${(y0 + a).toFixed(1)} ${x0.toFixed(1)},${(y0 + a).toFixed(1)} Z`;
}

export function spine(
  x0: number,
  y0: number,
  h0: number,
  x1: number,
  y1: number,
  h1: number
): string {
  const mx = (x0 + x1) / 2;
  const sy = y0 + Math.max(h0, 1.2) / 2;
  const ey = y1 + Math.max(h1, 1.2) / 2;
  return `M${x0.toFixed(1)},${sy.toFixed(1)} C${mx.toFixed(1)},${sy.toFixed(1)} ${mx.toFixed(1)},${ey.toFixed(1)} ${x1.toFixed(1)},${ey.toFixed(1)}`;
}

export function vRibbon(
  x0: number,
  y0: number,
  w0: number,
  x1: number,
  y1: number,
  w1: number
): string {
  const my = (y0 + y1) / 2;
  const a = Math.max(w0, 1.2);
  const b = Math.max(w1, 1.2);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} C${x0.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} L${(x1 + b).toFixed(1)},${y1.toFixed(1)} C${(x1 + b).toFixed(1)},${my.toFixed(1)} ${(x0 + a).toFixed(1)},${my.toFixed(1)} ${(x0 + a).toFixed(1)},${y0.toFixed(1)} Z`;
}

export function vSpine(
  x0: number,
  y0: number,
  w0: number,
  x1: number,
  y1: number,
  w1: number
): string {
  const my = (y0 + y1) / 2;
  const sx = x0 + Math.max(w0, 1.2) / 2;
  const ex = x1 + Math.max(w1, 1.2) / 2;
  return `M${sx.toFixed(1)},${y0.toFixed(1)} C${sx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${y1.toFixed(1)}`;
}

export function pct(x: number, y: number): { left: string; top: string } {
  return { left: `${(x / VB.w) * 100}%`, top: `${(y / VB.h) * 100}%` };
}
