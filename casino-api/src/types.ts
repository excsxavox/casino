export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  createdAt: string;
}

export interface GameSession {
  id: string;
  userId: string;
  game: "slots" | "blackjack" | "roulette" | "plinko" | "minesweeper";
  bet: number;
  result: "win" | "loss" | "push";
  payout: number;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "deposit" | "withdraw" | "bet" | "win";
  amount: number;
  balanceAfter: number;
  createdAt: string;
}
