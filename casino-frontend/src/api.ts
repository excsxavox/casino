const API = "/api";

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
}

export interface GameInfo {
  id: string;
  name: string;
  minBet: number;
  maxBet: number;
}

export async function createUser(username: string, email: string): Promise<User> {
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email }),
  });
  if (!res.ok) throw new Error("Error al crear usuario");
  return res.json();
}

export async function getUser(id: string): Promise<User> {
  const res = await fetch(`${API}/users/${id}`);
  if (!res.ok) throw new Error("Usuario no encontrado");
  return res.json();
}

export async function deposit(userId: string, amount: number): Promise<User> {
  const res = await fetch(`${API}/users/${userId}/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Error al depositar");
  return res.json();
}

export type CryptoCurrency = "usdttrc20" | "btc" | "eth";

export type PaymentStatus =
  | "waiting"
  | "confirming"
  | "finished"
  | "failed"
  | "expired";

export interface CryptoPayment {
  id: string;
  userId: string;
  amountUsd: number;
  payCurrency: CryptoCurrency;
  payAmount: number;
  payAddress: string;
  status: PaymentStatus;
  provider: "demo" | "nowpayments";
  credited: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export async function getCryptoConfig(): Promise<{
  demo: boolean;
  provider: "demo" | "nowpayments";
  sandbox: boolean;
}> {
  const res = await fetch(`${API}/payments/crypto/config`);
  if (!res.ok) throw new Error("Error al cargar configuración");
  return res.json();
}

export async function getCryptoCurrencies(): Promise<
  { id: CryptoCurrency; label: string; symbol: string }[]
> {
  const res = await fetch(`${API}/payments/crypto/currencies`);
  if (!res.ok) throw new Error("Error al cargar monedas");
  return res.json();
}

export async function createCryptoCheckout(
  userId: string,
  amountUsd: number,
  currency: CryptoCurrency
): Promise<{ payment: CryptoPayment; demo: boolean }> {
  const res = await fetch(`${API}/payments/crypto/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, amountUsd, currency }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al crear pago crypto");
  }
  return res.json();
}

export async function getCryptoPayment(
  paymentId: string,
  userId: string
): Promise<CryptoPayment> {
  const res = await fetch(
    `${API}/payments/crypto/${paymentId}?userId=${encodeURIComponent(userId)}`
  );
  if (!res.ok) throw new Error("Pago no encontrado");
  return res.json();
}

export async function confirmCryptoDemo(paymentId: string): Promise<void> {
  const res = await fetch(`${API}/payments/crypto/demo/confirm/${paymentId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al confirmar pago");
  }
}

export async function getGames(): Promise<GameInfo[]> {
  const res = await fetch("/games");
  return res.json();
}

export async function playSlots(userId: string, bet: number) {
  const res = await fetch(`${API}/games/${userId}/slots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bet }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al jugar");
  }
  return res.json();
}

export async function playBlackjack(userId: string, bet: number) {
  const res = await fetch(`${API}/games/${userId}/blackjack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bet }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al jugar");
  }
  return res.json();
}

export async function playRoulette(
  userId: string,
  bet: number,
  rouletteBet: { type: string; value?: number | string }
) {
  const res = await fetch(`${API}/games/${userId}/roulette`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bet, rouletteBet }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al jugar");
  }
  return res.json();
}

export async function playPlinko(
  userId: string,
  bet: number,
  risk: "low" | "medium" | "high" = "medium",
  count = 1
) {
  const res = await fetch(`${API}/games/${userId}/plinko`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bet, risk, count }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al jugar");
  }
  return res.json();
}

export async function playRouletteRound(
  userId: string,
  bets: { amount: number; rouletteBet: { type: string; value?: number | string } }[]
) {
  const res = await fetch(`${API}/games/${userId}/roulette`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bets }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al jugar");
  }
  return res.json();
}

export interface MinesweeperState {
  sessionId: string;
  hash: string;
  bet: number;
  bombs: number;
  revealed: number[];
  total: number;
  next: number;
  profit: number;
  ended: boolean;
  balance: number;
}

export async function startMinesweeper(
  userId: string,
  bet: number,
  bombs: number
): Promise<MinesweeperState> {
  const res = await fetch(`${API}/games/${userId}/minesweeper/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bet, bombs }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al iniciar partida");
  }
  return res.json();
}

export async function revealMinesweeperCell(userId: string, cell: number) {
  const res = await fetch(`${API}/games/${userId}/minesweeper/reveal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cell }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al revelar casilla");
  }
  return res.json();
}

export async function cashoutMinesweeper(userId: string) {
  const res = await fetch(`${API}/games/${userId}/minesweeper/cashout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al retirar");
  }
  return res.json();
}
