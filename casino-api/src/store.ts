import { v4 as uuid } from "uuid";
import type { GameSession, Transaction, User } from "./types";

const users = new Map<string, User>();
const sessions = new Map<string, GameSession>();
const transactions = new Map<string, Transaction>();

export function createUser(username: string, email: string): User {
  const user: User = {
    id: uuid(),
    username,
    email,
    balance: 1000,
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  return user;
}

export function getUser(id: string): User | undefined {
  return users.get(id);
}

export function getAllUsers(): User[] {
  return Array.from(users.values());
}

export function updateBalance(userId: string, amount: number): User | null {
  const user = users.get(userId);
  if (!user) return null;
  user.balance += amount;
  users.set(userId, user);
  return user;
}

export function addTransaction(
  userId: string,
  type: Transaction["type"],
  amount: number,
  balanceAfter: number
): Transaction {
  const tx: Transaction = {
    id: uuid(),
    userId,
    type,
    amount,
    balanceAfter,
    createdAt: new Date().toISOString(),
  };
  transactions.set(tx.id, tx);
  return tx;
}

export function addSession(session: GameSession): GameSession {
  sessions.set(session.id, session);
  return session;
}

export function getSessionsByUser(userId: string): GameSession[] {
  return Array.from(sessions.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAllSessions(): GameSession[] {
  return Array.from(sessions.values());
}

export function getAllTransactions(): Transaction[] {
  return Array.from(transactions.values());
}

export function getStats() {
  const allSessions = getAllSessions();
  const totalBets = allSessions.reduce((sum, s) => sum + s.bet, 0);
  const totalPayouts = allSessions.reduce((sum, s) => sum + s.payout, 0);
  const houseEdge = totalBets - totalPayouts;

  return {
    totalUsers: users.size,
    totalGames: allSessions.length,
    totalBets,
    totalPayouts,
    houseEdge,
    activeUsers: users.size,
  };
}
