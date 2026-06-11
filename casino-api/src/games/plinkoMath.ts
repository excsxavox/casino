export const PLINKO_ROWS = 10;
export const PLINKO_SLOTS = PLINKO_ROWS + 1;

export type PlinkoRisk = "low" | "medium" | "high";

/** Binomial(n=10, p=0.5) — probabilidad real por casilla 0..10 */
export const SLOT_PROBABILITIES: number[] = (() => {
  const n = PLINKO_ROWS;
  const denom = 2 ** n;
  let comb = 1;
  const probs: number[] = [];
  for (let k = 0; k <= n; k++) {
    if (k > 0) comb = (comb * (n - k + 1)) / k;
    probs.push(comb / denom);
  }
  return probs;
})();

/**
 * Multiplicadores calibrados por EV ≈ RTP (retorno al jugador).
 * low ~96.5% | medium ~94.7% | high ~92.5%
 */
export const MULTIPLIERS: Record<PlinkoRisk, number[]> = {
  low: [1.4, 1.2, 1.1, 1.02, 0.96, 0.85, 0.96, 1.02, 1.1, 1.2, 1.4],
  medium: [15, 5, 2, 1.2, 0.74, 0.24, 0.74, 1.2, 2, 5, 15],
  high: [50, 11, 2.8, 0.9, 0.32, 0.1, 0.32, 0.9, 2.8, 11, 50],
};

export const RTP: Record<PlinkoRisk, number> = {
  low: expectedValue(MULTIPLIERS.low),
  medium: expectedValue(MULTIPLIERS.medium),
  high: expectedValue(MULTIPLIERS.high),
};

export function expectedValue(multipliers: number[]): number {
  return SLOT_PROBABILITIES.reduce((sum, p, i) => sum + p * multipliers[i], 0);
}

/** Elige casilla según distribución binomial real (equivalente a física justa). */
export function pickSlot(random = Math.random()): number {
  let cumulative = 0;
  for (let slot = 0; slot < PLINKO_SLOTS; slot++) {
    cumulative += SLOT_PROBABILITIES[slot];
    if (random < cumulative) return slot;
  }
  return PLINKO_SLOTS - 1;
}

/**
 * Genera un camino L/R que termina en `slot` (exactamente `slot` derechas).
 * Orden aleatorio uniforme entre todos los caminos válidos.
 */
export function buildPathToSlot(slot: number, random = Math.random): ("L" | "R")[] {
  let rightsLeft = slot;
  let stepsLeft = PLINKO_ROWS;
  const path: ("L" | "R")[] = [];

  for (let i = 0; i < PLINKO_ROWS; i++) {
    if (rightsLeft === 0) {
      path.push("L");
    } else if (rightsLeft === stepsLeft) {
      path.push("R");
      rightsLeft--;
    } else {
      const pRight = rightsLeft / stepsLeft;
      if (random() < pRight) {
        path.push("R");
        rightsLeft--;
      } else {
        path.push("L");
      }
    }
    stepsLeft--;
  }

  return path;
}
