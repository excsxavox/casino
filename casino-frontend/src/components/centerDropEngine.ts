import { ROWS, type PlinkoRisk, MULTIPLIERS, tubeColors } from "./plinkoData";

export const CYAN = "#00f0ff";
export const MAGENTA = "#ff00aa";
export const GOLD = "#ffd700";
export const CYAN_RGBA = "0,240,255";
export const MAGENTA_RGBA = "255,0,170";
export const GOLD_RGBA = "255,215,0";

export const WIN_START = 4;
export const WIN_END = 6;
export const JACKPOT_TI = 5;
const BASE_TUBE_W = 44;
const BASE_JACKPOT_W = 50;

export interface Layout {
  W: number;
  H: number;
  scale: number;
  CX: number;
  TOP_Y: number;
  ROW_SPACING: number;
  PEG_SPACING: number;
  PEG_RADIUS: number;
  BALL_RADIUS: number;
  TUBE_TOP: number;
  TUBE_HEIGHT: number;
  tubeLefts: number[];
}

export interface PathPoint {
  x: number;
  y: number;
  phase: "start" | "peg" | "land";
  row?: number;
  pegIdx?: number;
  tubeIdx?: number;
}

export interface PegFlash {
  row: number;
  peg: number;
  alpha: number;
}

export interface AnimBall {
  id: string;
  path: PathPoint[];
  segIdx: number;
  segT: number;
  finalSlot: number;
  hue: number;
  done: boolean;
  landedAt?: number;
}

export function computeLayout(W: number, H: number): Layout {
  const scale = W / 480;
  const CX = W / 2;
  const TOP_Y = H * (85 / 660);
  const ROW_SPACING = H * (44 / 660);
  const PEG_SPACING = W * (42 / 480);
  const PEG_RADIUS = Math.max(5, 6 * scale);
  const BALL_RADIUS = Math.max(6, 7 * scale);
  const TUBE_TOP = TOP_Y + ROWS * ROW_SPACING + H * (14 / 660);
  const TUBE_HEIGHT = H - TUBE_TOP - H * (22 / 660);
  const tubeW = Math.round(BASE_TUBE_W * scale);
  const jackpotW = Math.round(BASE_JACKPOT_W * scale);

  const tubeLefts: number[] = [];
  const totalW = 10 * tubeW + jackpotW;
  let x = (W - totalW) / 2;
  for (let i = 0; i <= ROWS; i++) {
    tubeLefts.push(x);
    x += i === JACKPOT_TI ? jackpotW : tubeW;
  }

  return {
    W, H, scale, CX, TOP_Y, ROW_SPACING, PEG_SPACING, PEG_RADIUS, BALL_RADIUS,
    TUBE_TOP, TUBE_HEIGHT, tubeLefts,
  };
}

export function getTubeWidth(i: number, L: Layout): number {
  const tw = Math.round(BASE_TUBE_W * L.scale);
  const jw = Math.round(BASE_JACKPOT_W * L.scale);
  return i === JACKPOT_TI ? jw : tw;
}

export function tubeCenterX(slot: number, L: Layout): number {
  return L.tubeLefts[slot] + getTubeWidth(slot, L) / 2;
}

export function isWinTube(i: number): boolean {
  return i >= WIN_START && i <= WIN_END;
}

export function centerTubeLabel(mult: number): string {
  if (mult >= 10) return "JACKPOT";
  if (mult >= 1) return "CENTRO";
  return "ZONA RIESGO";
}

export function buildPath(path: ("L" | "R")[], finalSlot: number, L: Layout): PathPoint[] {
  let slot = 0;
  const points: PathPoint[] = [{ x: L.CX, y: L.TOP_Y - L.ROW_SPACING * 0.55, phase: "start" }];

  for (let r = 0; r < ROWS; r++) {
    const pegX = L.CX - (r * L.PEG_SPACING) / 2 + slot * L.PEG_SPACING;
    const pegY = L.TOP_Y + r * L.ROW_SPACING;
    points.push({ x: pegX, y: pegY, phase: "peg", row: r, pegIdx: slot });
    if (path[r] === "R") slot++;
  }

  points.push({
    x: tubeCenterX(finalSlot, L),
    y: L.TUBE_TOP + L.TUBE_HEIGHT - 4,
    phase: "land",
    tubeIdx: finalSlot,
  });

  return points;
}

export function pegPosition(L: Layout, row: number, peg: number) {
  return {
    x: L.CX - (row * L.PEG_SPACING) / 2 + peg * L.PEG_SPACING,
    y: L.TOP_Y + row * L.ROW_SPACING,
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export const SEG_DURATION = 130;

export function stepBall(ball: AnimBall, dt: number, flashQueue: PegFlash[]): { x: number; y: number; landed: boolean } {
  const totalSegs = ball.path.length - 1;
  if (ball.segIdx >= totalSegs) {
    const last = ball.path.at(-1)!;
    return { x: last.x, y: last.y, landed: true };
  }

  ball.segT += dt / SEG_DURATION;

  if (ball.segT >= 1) {
    const p1 = ball.path[ball.segIdx + 1];
    if (p1.phase === "peg" && p1.row !== undefined && p1.pegIdx !== undefined) {
      flashQueue.push({ row: p1.row, peg: p1.pegIdx, alpha: 1 });
    }
    ball.segIdx++;
    ball.segT = 0;
    if (ball.segIdx >= totalSegs) {
      const last = ball.path.at(-1)!;
      return { x: last.x, y: last.y, landed: true };
    }
  }

  const p0 = ball.path[ball.segIdx];
  const p1 = ball.path[ball.segIdx + 1];
  const e = easeInOut(Math.min(ball.segT, 1));
  return {
    x: p0.x + (p1.x - p0.x) * e,
    y: p0.y + (p1.y - p0.y) * e,
    landed: false,
  };
}

function fs(L: Layout, base: number): number {
  return Math.max(base * 0.75, base * L.scale);
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  risk: PlinkoRisk,
  pegFlashes: PegFlash[],
  highlightedTube: number,
  balls: { x: number; y: number; landed: boolean; slot: number; hue: number; trail?: { x: number; y: number }[] }[],
  goldPulse = 0
) {
  const { W, H, CX, TOP_Y, PEG_RADIUS, BALL_RADIUS, TUBE_TOP, TUBE_HEIGHT, tubeLefts } = L;
  const multipliers = MULTIPLIERS[risk];

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0a0a16";
  ctx.fillRect(0, 0, W, H);

  const bg = ctx.createRadialGradient(CX, H * 0.35, 0, CX, H * 0.35, H * 0.75);
  bg.addColorStop(0, "rgba(0,240,255,0.05)");
  bg.addColorStop(0.5, "rgba(0,240,255,0.015)");
  bg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (goldPulse > 0) {
    ctx.fillStyle = `rgba(${GOLD_RGBA},${goldPulse * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  }

  const tubePulse = Math.sin(Date.now() / 1200) * 0.5 + 0.5;

  for (let i = 0; i <= ROWS; i++) {
    const x = tubeLefts[i];
    const w = getTubeWidth(i, L);
    const isCenter = i === JACKPOT_TI;
    const isHl = i === highlightedTube;
    const mult = multipliers[i];
    const tc = tubeColors(mult, isCenter);
    const pulse = isCenter ? 0.15 + tubePulse * 0.2 : 0;

    if (isHl) {
      ctx.shadowColor = `rgba(${tc.glow},0.6)`;
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = isHl ? tc.fill.replace("0.", "0.5").replace(/0\.\d+/, (m) => String(Math.min(0.65, parseFloat(m) + 0.25))) : tc.fill;
    if (isCenter) {
      ctx.fillStyle = `rgba(${tc.glow},${0.18 + pulse + (isHl ? 0.25 : 0)})`;
    }
    ctx.fillRect(x, TUBE_TOP, w, TUBE_HEIGHT);

    ctx.strokeStyle = tc.stroke;
    ctx.lineWidth = isCenter ? Math.max(2, 2.5 * L.scale) : isHl ? 2 : 1;
    if (isCenter) {
      ctx.shadowColor = `rgba(${tc.glow},${0.5 + tubePulse * 0.3})`;
      ctx.shadowBlur = 12 + tubePulse * 8;
    }
    ctx.strokeRect(x, TUBE_TOP, w, TUBE_HEIGHT);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    if (isCenter) {
      const label = centerTubeLabel(mult);
      ctx.fillStyle = mult < 1 ? "#fbbf24" : `rgba(${GOLD_RGBA},0.95)`;
      ctx.font = `bold ${fs(L, 7)}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, x + w / 2, TUBE_TOP + 5 * L.scale);
    }

    ctx.fillStyle = tc.text;
    ctx.font = `bold ${fs(L, mult >= 10 ? 13 : 11)}px Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textY = isCenter ? TUBE_TOP + TUBE_HEIGHT * 0.58 : TUBE_TOP + TUBE_HEIGHT * 0.5;
    ctx.fillText(`${mult}x`, x + w / 2, textY);
  }

  const ws = tubeLefts[WIN_START];
  const we = tubeLefts[WIN_END] + getTubeWidth(WIN_END, L);
  ctx.strokeStyle = `rgba(${CYAN_RGBA},0.2)`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.strokeRect(ws, TUBE_TOP, we - ws, TUBE_HEIGHT);
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(${CYAN_RGBA},0.35)`;
  ctx.font = `${fs(L, 7)}px Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ZONA GANADORA", (ws + we) / 2, TUBE_TOP - 12 * L.scale);

  for (let r = 0; r < ROWS; r++) {
    for (let p = 0; p <= r; p++) {
      const { x, y } = pegPosition(L, r, p);
      const flash = pegFlashes.find((f) => f.row === r && f.peg === p);
      const bright = flash ? flash.alpha : 0;

      if (bright > 0.01) {
        const burstR = PEG_RADIUS * (2.5 + bright * 5);
        const burst = ctx.createRadialGradient(x, y, 0, x, y, burstR);
        burst.addColorStop(0, `rgba(255,255,255,${bright * 0.7})`);
        burst.addColorStop(0.2, `rgba(200,120,255,${bright * 0.45})`);
        burst.addColorStop(0.5, `rgba(0,240,255,${bright * 0.2})`);
        burst.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = burst;
        ctx.beginPath();
        ctx.arc(x, y, burstR, 0, Math.PI * 2);
        ctx.fill();
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2;
          ctx.strokeStyle = `rgba(255,200,255,${bright * 0.5})`;
          ctx.lineWidth = 1.5 * bright;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(ang) * burstR * 0.7, y + Math.sin(ang) * burstR * 0.7);
          ctx.stroke();
        }
      }

      const glowR = PEG_RADIUS * (2 + bright * 2);
      const ambient = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      ambient.addColorStop(0, `rgba(255,255,255,${0.12 + bright * 0.3})`);
      ambient.addColorStop(0.5, `rgba(180,140,255,${0.05 + bright * 0.15})`);
      ambient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ambient;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, PEG_RADIUS, 0, Math.PI * 2);
      const b = Math.min(1, bright * 1.8);
      ctx.fillStyle = `rgb(${Math.round(200 + 55 * b)},${Math.round(200 + 55 * b)},${Math.round(220 + 35 * b)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(200,180,255,${0.4 + bright * 0.5})`;
      ctx.lineWidth = 1.2 + bright;
      ctx.stroke();
    }
  }

  const dropR = 18 * L.scale;
  ctx.strokeStyle = `rgba(${CYAN_RGBA},0.35)`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(CX, TOP_Y - 10 * L.scale, dropR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const dropGlow = ctx.createRadialGradient(CX, TOP_Y - 10 * L.scale, 0, CX, TOP_Y - 10 * L.scale, dropR);
  dropGlow.addColorStop(0, `rgba(${CYAN_RGBA},0.12)`);
  dropGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = dropGlow;
  ctx.beginPath();
  ctx.arc(CX, TOP_Y - 10 * L.scale, dropR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${CYAN_RGBA},0.7)`;
  ctx.font = `bold ${fs(L, 8)}px Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("ZONA DE CAÍDA", CX, TOP_Y - 18 * L.scale);

  for (const ball of balls) {
    const isJp = ball.landed && ball.slot === JACKPOT_TI;
    const win = ball.landed && isWinTube(ball.slot);
    const col = ball.landed ? (isJp ? GOLD_RGBA : win ? CYAN_RGBA : MAGENTA_RGBA) : "200,120,255";

    if (ball.trail && ball.trail.length > 1 && !ball.landed) {
      for (let t = 0; t < ball.trail.length - 1; t++) {
        const alpha = (t + 1) / ball.trail.length * 0.35;
        const pt = ball.trail[t];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, BALL_RADIUS * (0.4 + alpha), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,120,255,${alpha})`;
        ctx.fill();
      }
    }

    const outerGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_RADIUS * 2.8);
    outerGlow.addColorStop(0, `rgba(${col},${ball.landed ? 0.5 : 0.35})`);
    outerGlow.addColorStop(0.5, `rgba(${col},${ball.landed ? 0.15 : 0.1})`);
    outerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS * 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = `rgba(${col},${ball.landed ? 0.7 : 0.45})`;
    ctx.shadowBlur = ball.landed ? 32 : 18;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    const gr = ctx.createRadialGradient(
      ball.x - BALL_RADIUS * 0.35, ball.y - BALL_RADIUS * 0.35, 0,
      ball.x, ball.y, BALL_RADIUS
    );
    if (ball.landed) {
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.3, `rgba(${col},1)`);
      gr.addColorStop(1, `rgba(${col},0.3)`);
    } else {
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(220,160,255,1)");
      gr.addColorStop(0.7, "rgba(140,80,220,0.9)");
      gr.addColorStop(1, "rgba(60,30,120,0.5)");
    }
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
