import { ROWS, ballX } from "./plinkoData";

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  ms: number;
}

/** Filas con 1, 2, 3 … pinos (triángulo clásico) */
export function pegCount(row: number): number {
  return row + 1;
}

/** Y del centro del pino en la fila */
export function pegRowY(row: number): number {
  return (row + 1) / (ROWS + 2);
}

/** X del pino `peg` en la fila `row` (0–1) */
export function pegX(row: number, peg: number): number {
  const n = pegCount(row);
  const spread = (row + 2) / (ROWS + 2);
  const left = 0.5 - spread / 2;
  const step = spread / (n + 1);
  return left + step * (peg + 1);
}

/** Posición horizontal de la bolita en la fila `row` con `slot` desvíos a la derecha */
export function ballAtRow(row: number, slot: number): number {
  if (row <= 0) return 0.5;
  if (row >= ROWS) return ballX(slot);
  const target = ballX(slot);
  const t = Math.pow(row / ROWS, 0.8);
  return 0.5 + (target - 0.5) * t;
}

/** Pino que golpea la bolita en esta fila */
export function pegHitIndex(row: number, slot: number, goRight: boolean): number {
  const n = pegCount(row);
  if (goRight) return Math.min(slot + 1, n - 1);
  return Math.max(slot, 0);
}

export function buildSegments(
  path: ("L" | "R")[],
  finalSlot: number
): { segments: Segment[]; totalMs: number } {
  const segments: Segment[] = [];
  let slot = 0;
  let x = 0.5;
  let y = 0.055;

  for (let row = 0; row < ROWS; row++) {
    const goRight = path[row] === "R";
    const nextSlot = goRight ? slot + 1 : slot;
    const py = pegRowY(row);
    const pegIdx = pegHitIndex(row, slot, goRight);
    const pegPx = pegX(row, pegIdx);
    const exitX = ballAtRow(row + 1, nextSlot);

    segments.push({ x0: x, y0: y, x1: pegPx, y1: py - 0.008, ms: 200 });
    segments.push({ x0: pegPx, y0: py - 0.008, x1: pegPx, y1: py + 0.008, ms: 90 });
    segments.push({ x0: pegPx, y0: py + 0.008, x1: exitX, y1: py + 0.024, ms: 140 });

    x = exitX;
    y = py + 0.022;
    slot = nextSlot;
  }

  const landY = pegRowY(ROWS - 1) + (1 - pegRowY(ROWS - 1)) * 0.85;
  segments.push({ x0: x, y0: y, x1: ballX(finalSlot), y1: landY, ms: 240 });

  const totalMs = segments.reduce((s, seg) => s + seg.ms, 0);
  return { segments, totalMs };
}

function easeIn(t: number): number {
  return t * t;
}

function easeOutBounce(t: number): number {
  if (t < 0.55) return easeIn(t / 0.55) * 0.7;
  return 0.7 + easeOut((t - 0.55) / 0.45) * 0.3;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2);
}

export function positionAt(segments: Segment[], elapsedMs: number): Point {
  let t = Math.max(0, elapsedMs);

  for (const seg of segments) {
    if (t <= seg.ms) {
      const p = t / seg.ms;
      const isFall = seg.y1 > seg.y0 + 0.003;
      const isBounce = !isFall && Math.abs(seg.x1 - seg.x0) > 0.008;
      const e = isFall ? easeIn(p) : isBounce ? easeOutBounce(p) : easeOut(p);
      return {
        x: seg.x0 + (seg.x1 - seg.x0) * e,
        y: seg.y0 + (seg.y1 - seg.y0) * e,
      };
    }
    t -= seg.ms;
  }

  const last = segments[segments.length - 1];
  return { x: last.x1, y: last.y1 };
}
