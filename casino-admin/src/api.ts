const API = "/api/admin";

export interface Stats {
  totalUsers: number;
  totalGames: number;
  totalBets: number;
  totalPayouts: number;
  houseEdge: number;
  activeUsers: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  game: string;
  bet: number;
  result: string;
  payout: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API}/stats`);
  return res.json();
}

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API}/users`);
  return res.json();
}

export async function getSessions(): Promise<Session[]> {
  const res = await fetch(`${API}/sessions`);
  return res.json();
}

export async function getTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API}/transactions`);
  return res.json();
}
