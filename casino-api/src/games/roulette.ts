const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export type RouletteBet =
  | { type: "number"; value: number | "00" }
  | { type: "red" | "black" | "even" | "odd" | "low" | "high" }
  | { type: "dozen"; value: 1 | 2 | 3 }
  | { type: "column"; value: 1 | 2 | 3 };

export interface RouletteWager {
  amount: number;
  rouletteBet: RouletteBet;
}

const WHEEL_ORDER: (number | "00")[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  "00", 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
];

function spinAmerican(): number | "00" {
  return WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
}

function getColor(n: number | "00"): "red" | "black" | "green" {
  if (n === 0 || n === "00") return "green";
  return RED_NUMBERS.includes(n) ? "red" : "black";
}

function evaluateBet(bet: RouletteBet, winning: number | "00"): { won: boolean; multiplier: number } {
  const n = winning === "00" ? -1 : winning;
  const isRed = typeof winning === "number" && RED_NUMBERS.includes(winning);
  const isBlack = typeof winning === "number" && winning !== 0 && !isRed;
  const isEven = typeof winning === "number" && winning !== 0 && winning % 2 === 0;
  const isOdd = typeof winning === "number" && winning !== 0 && winning % 2 === 1;

  switch (bet.type) {
    case "number":
      return { won: winning === bet.value, multiplier: 35 };
    case "red":
      return { won: isRed, multiplier: 1 };
    case "black":
      return { won: isBlack, multiplier: 1 };
    case "even":
      return { won: isEven, multiplier: 1 };
    case "odd":
      return { won: isOdd, multiplier: 1 };
    case "low":
      return { won: n >= 1 && n <= 18, multiplier: 1 };
    case "high":
      return { won: n >= 19 && n <= 36, multiplier: 1 };
    case "dozen": {
      const start = (bet.value - 1) * 12 + 1;
      const won = n >= start && n <= start + 11;
      return { won, multiplier: 2 };
    }
    case "column": {
      const col = bet.value;
      const won = n > 0 && n % 3 === (col === 3 ? 0 : col);
      return { won, multiplier: 2 };
    }
    default:
      return { won: false, multiplier: 0 };
  }
}

export function playRoulette(bet: number, rouletteBet: RouletteBet) {
  const winningNumber = spinAmerican();
  const { won, multiplier } = evaluateBet(rouletteBet, winningNumber);
  const payout = won ? bet * (multiplier + 1) : 0;

  return {
    winningNumber,
    color: getColor(winningNumber),
    bet: rouletteBet,
    result: won ? ("win" as const) : ("loss" as const),
    payout,
  };
}

export function playRouletteRound(wagers: RouletteWager[]) {
  const winningNumber = spinAmerican();
  const color = getColor(winningNumber);

  let totalPayout = 0;
  const results = wagers.map((w) => {
    const { won, multiplier } = evaluateBet(w.rouletteBet, winningNumber);
    const payout = won ? w.amount * (multiplier + 1) : 0;
    totalPayout += payout;
    return { ...w, won, payout };
  });

  const totalBet = wagers.reduce((s, w) => s + w.amount, 0);
  const netResult = totalPayout > totalBet ? "win" : totalPayout === totalBet ? "push" : "loss";

  return {
    winningNumber,
    color,
    totalBet,
    totalPayout,
    result: netResult as "win" | "loss" | "push",
    bets: results,
  };
}
