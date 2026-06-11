import {
  MULTIPLIERS,
  PLINKO_ROWS,
  PLINKO_SLOTS,
  RTP,
  SLOT_PROBABILITIES,
  type PlinkoRisk,
  buildPathToSlot,
  pickSlot,
} from "./plinkoMath";

export type { PlinkoRisk };

export function getPlinkoConfig() {
  return {
    rows: PLINKO_ROWS,
    slots: PLINKO_SLOTS,
    risks: Object.keys(MULTIPLIERS) as PlinkoRisk[],
    multipliers: MULTIPLIERS,
    probabilities: SLOT_PROBABILITIES,
    rtp: RTP,
    houseEdge: {
      low: 1 - RTP.low,
      medium: 1 - RTP.medium,
      high: 1 - RTP.high,
    },
  };
}

export function playPlinko(bet: number, risk: PlinkoRisk = "medium") {
  const multipliers = MULTIPLIERS[risk] ?? MULTIPLIERS.medium;

  // 1) Resultado determinado por RNG (distribución binomial real)
  const slot = pickSlot();
  // 2) Camino coherente con la casilla — no al revés
  const path = buildPathToSlot(slot);

  const multiplier = multipliers[slot] ?? 1;
  const payout = Math.floor(bet * multiplier);
  const result = payout > bet ? "win" : payout === bet ? "push" : "loss";

  return {
    risk,
    rows: PLINKO_ROWS,
    path,
    slot,
    multiplier,
    payout,
    result: result as "win" | "loss" | "push",
  };
}

export function playPlinkoMulti(count: number, bet: number, risk: PlinkoRisk = "medium") {
  const balls = Array.from({ length: count }, () => playPlinko(bet, risk));
  const totalBet = bet * count;
  const totalPayout = balls.reduce((s, b) => s + b.payout, 0);
  const netResult =
    totalPayout > totalBet ? "win" : totalPayout === totalBet ? "push" : "loss";

  return {
    risk,
    count,
    totalBet,
    totalPayout,
    result: netResult as "win" | "loss" | "push",
    balls,
  };
}
