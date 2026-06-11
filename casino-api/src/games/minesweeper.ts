import crypto from "crypto";
import { v4 as uuid } from "uuid";

const GRID_SIZE = 25;
const MIN_BET = 10;
const MAX_BET = 200;
const MIN_BOMBS = 1;
const MAX_BOMBS = 24;

export interface MinesweeperSession {
  id: string;
  userId: string;
  bet: number;
  bombs: number;
  bombCells: number[];
  revealed: number[];
  total: number;
  steps: number[];
  secret: string;
  hash: string;
  ended: boolean;
}

const sessions = new Map<string, MinesweeperSession>();

function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

function makeSecret(): string {
  return crypto.randomBytes(8).toString("hex");
}

export function generateBombs(count: number): number[] {
  const cells = new Set<number>();
  while (cells.size < count) {
    cells.add(Math.floor(Math.random() * GRID_SIZE) + 1);
  }
  return Array.from(cells);
}

/** Misma fórmula que MortalSoft minesweeperGame_generateAmount */
export function generateAmountSteps(bet: number, bombCount: number): number[] {
  const safe = GRID_SIZE - bombCount;
  const sum = round5((bet * bombCount) / safe);
  const xSum = sum / safe;
  const steps: number[] = [];
  for (let i = -Math.ceil(safe / 2) + 1; i <= Math.floor(safe / 2); i++) {
    steps.push(round5(sum + xSum * i));
  }
  return steps;
}

export function getSession(userId: string): MinesweeperSession | undefined {
  const s = sessions.get(userId);
  if (!s || s.ended) return undefined;
  return s;
}

export function startMinesweeper(
  userId: string,
  bet: number,
  bombs: number
): MinesweeperSession {
  if (sessions.has(userId) && !sessions.get(userId)!.ended) {
    throw new Error("ALREADY_PLAYING");
  }
  if (bet < MIN_BET || bet > MAX_BET) {
    throw new Error("INVALID_BET");
  }
  if (bombs < MIN_BOMBS || bombs > MAX_BOMBS) {
    throw new Error("INVALID_BOMBS");
  }

  const bombCells = generateBombs(bombs);
  const secret = makeSecret();
  const hash = crypto
    .createHash("sha256")
    .update(`${secret}-${bombCells.join("")}`)
    .digest("hex");

  const session: MinesweeperSession = {
    id: uuid(),
    userId,
    bet,
    bombs,
    bombCells,
    revealed: [],
    total: bet,
    steps: generateAmountSteps(bet, bombs),
    secret,
    hash,
    ended: false,
  };

  sessions.set(userId, session);
  return session;
}

function getNextStep(session: MinesweeperSession): number {
  if (session.revealed.length >= session.steps.length) return 0;
  return session.steps[session.revealed.length];
}

export function getMinesweeperState(session: MinesweeperSession) {
  return {
    sessionId: session.id,
    hash: session.hash,
    bet: session.bet,
    bombs: session.bombs,
    revealed: [...session.revealed],
    total: session.total,
    next: getNextStep(session),
    profit: round5(session.total - session.bet),
    ended: session.ended,
  };
}

export function revealMinesweeperCell(
  userId: string,
  cell: number
): {
  session: MinesweeperSession;
  hit: boolean;
  increment?: number;
  secret?: string;
  bombCells?: number[];
} {
  const session = getSession(userId);
  if (!session) throw new Error("NO_GAME");
  if (cell < 1 || cell > GRID_SIZE) throw new Error("INVALID_CELL");
  if (session.revealed.includes(cell)) throw new Error("ALREADY_REVEALED");

  if (session.bombCells.includes(cell)) {
    session.revealed.push(cell);
    session.ended = true;
    return {
      session,
      hit: true,
      secret: session.secret,
      bombCells: [...session.bombCells],
    };
  }

  const increment = getNextStep(session);
  session.revealed.push(cell);
  session.total = round5(session.total + increment);

  const allSafeRevealed = session.revealed.length + session.bombs >= GRID_SIZE;
  if (allSafeRevealed) {
    session.ended = true;
  }

  return { session, hit: false, increment };
}

export function cashoutMinesweeper(userId: string): MinesweeperSession {
  const session = getSession(userId);
  if (!session) throw new Error("NO_GAME");
  if (session.revealed.length === 0) throw new Error("NEED_ONE_TILE");
  session.ended = true;
  return session;
}

export function clearSession(userId: string): void {
  sessions.delete(userId);
}

export { MIN_BET, MAX_BET, MIN_BOMBS, MAX_BOMBS, GRID_SIZE };
