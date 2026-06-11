export const ROWS = 10;
export const SLOTS = ROWS + 1;

export type PlinkoRisk = "low" | "medium" | "high";

/**
 * Sincronizado con casino-api/src/games/plinkoMath.ts
 * RTP aprox: low 96.5% | medium 94.7% | high 92.5%
 */
export const MULTIPLIERS: Record<PlinkoRisk, number[]> = {
  low: [1.4, 1.2, 1.1, 1.02, 0.96, 0.85, 0.96, 1.02, 1.1, 1.2, 1.4],
  medium: [15, 5, 2, 1.2, 0.74, 0.24, 0.74, 1.2, 2, 5, 15],
  high: [50, 11, 2.8, 0.9, 0.32, 0.1, 0.32, 0.9, 2.8, 11, 50],
};

export const RTP_LABELS: Record<PlinkoRisk, string> = {
  low: "~96.5%",
  medium: "~94.7%",
  high: "~92.5%",
};

export const RISK_LABELS: Record<PlinkoRisk, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export const RISK_HINTS: Record<PlinkoRisk, string> = {
  low: "Ganancias frecuentes, premios moderados",
  medium: "Equilibrado — mini victorias y picos",
  high: "Alta volatilidad — premios grandes y raros",
};

export function slotColor(multiplier: number): string {
  if (multiplier >= 10) return "#a855f7";
  if (multiplier >= 3) return "#ef4444";
  if (multiplier >= 1.5) return "#f59e0b";
  if (multiplier >= 1) return "#22c55e";
  return "#64748b";
}

export function ballX(slot: number): number {
  return (slot + 0.5) / (ROWS + 1);
}

export function ballY(row: number): number {
  return (row + 1) / (ROWS + 2);
}

export interface TubeColors {
  fill: string;
  stroke: string;
  text: string;
  glow: string;
}

export function tubeColors(mult: number, isCenter: boolean): TubeColors {
  if (isCenter && mult < 1) {
    return {
      fill: "rgba(239,68,68,0.22)",
      stroke: "#f97316",
      text: "#ffffff",
      glow: "255,120,50",
    };
  }
  if (mult >= 15) {
    return { fill: "rgba(249,115,22,0.35)", stroke: "#fb923c", text: "#fff7ed", glow: "249,115,22" };
  }
  if (mult >= 5) {
    return { fill: "rgba(236,72,153,0.32)", stroke: "#f472b6", text: "#fdf2f8", glow: "236,72,153" };
  }
  if (mult >= 2) {
    return { fill: "rgba(168,85,247,0.3)", stroke: "#c084fc", text: "#faf5ff", glow: "168,85,247" };
  }
  if (mult >= 1.5) {
    return { fill: "rgba(59,130,246,0.28)", stroke: "#60a5fa", text: "#eff6ff", glow: "59,130,246" };
  }
  if (mult >= 1) {
    return { fill: "rgba(34,211,238,0.22)", stroke: "#22d3ee", text: "#ecfeff", glow: "34,211,238" };
  }
  return { fill: "rgba(100,116,139,0.2)", stroke: "#94a3b8", text: "#e2e8f0", glow: "100,116,139" };
}
