export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const WHEEL_ORDER: (number | "00")[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  "00", 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
];

export const CHIPS = [1, 5, 25, 100, 500] as const;

export const NUMBER_GRID: number[][] = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

export function getNumberColor(n: number): "red" | "black" {
  return RED_NUMBERS.includes(n) ? "red" : "black";
}

export type BetSpot =
  | { id: string; type: "number"; value: number | "00" }
  | { id: string; type: "dozen"; value: 1 | 2 | 3 }
  | { id: string; type: "column"; value: 1 | 2 | 3 }
  | { id: string; type: "low" | "high" | "even" | "odd" | "red" | "black" };

export const BET_SPOTS: Record<string, BetSpot> = {
  "n-0": { id: "n-0", type: "number", value: 0 },
  "n-00": { id: "n-00", type: "number", value: "00" },
  "dozen-1": { id: "dozen-1", type: "dozen", value: 1 },
  "dozen-2": { id: "dozen-2", type: "dozen", value: 2 },
  "dozen-3": { id: "dozen-3", type: "dozen", value: 3 },
  "col-1": { id: "col-1", type: "column", value: 1 },
  "col-2": { id: "col-2", type: "column", value: 2 },
  "col-3": { id: "col-3", type: "column", value: 3 },
  low: { id: "low", type: "low" },
  high: { id: "high", type: "high" },
  even: { id: "even", type: "even" },
  odd: { id: "odd", type: "odd" },
  red: { id: "red", type: "red" },
  black: { id: "black", type: "black" },
};

for (let i = 1; i <= 36; i++) {
  BET_SPOTS[`n-${i}`] = { id: `n-${i}`, type: "number", value: i };
}

export function spotToApiBet(spot: BetSpot) {
  if (spot.type === "number") return { type: "number" as const, value: spot.value };
  if (spot.type === "dozen") return { type: "dozen" as const, value: spot.value };
  if (spot.type === "column") return { type: "column" as const, value: spot.value };
  return { type: spot.type };
}
