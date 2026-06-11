import { Router } from "express";
import { v4 as uuid } from "uuid";
import { playBlackjack } from "../games/blackjack";
import { playRoulette, playRouletteRound } from "../games/roulette";
import { playPlinko, playPlinkoMulti } from "../games/plinko";
import {
  cashoutMinesweeper,
  clearSession,
  getMinesweeperState,
  getSession,
  revealMinesweeperCell,
  startMinesweeper,
} from "../games/minesweeper";
import { playSlots } from "../games/slots";
import {
  addSession,
  addTransaction,
  getSessionsByUser,
  getUser,
  updateBalance,
} from "../store";

const router = Router();

type BetResult =
  | { error: string; status: number }
  | { user: NonNullable<ReturnType<typeof getUser>> };

function processBet(userId: string, bet: number): BetResult {
  const user = getUser(userId);
  if (!user) return { error: "Usuario no encontrado", status: 404 };
  if (bet <= 0) return { error: "Apuesta inválida", status: 400 };
  if (user.balance < bet) return { error: "Saldo insuficiente", status: 400 };

  updateBalance(userId, -bet);
  addTransaction(userId, "bet", bet, user.balance - bet);
  return { user: getUser(userId)! };
}

function processResult(
  userId: string,
  game: "slots" | "blackjack" | "roulette" | "plinko" | "minesweeper",
  bet: number,
  result: "win" | "loss" | "push",
  payout: number,
  details: Record<string, unknown>
) {
  if (payout > 0) {
    const user = updateBalance(userId, payout);
    addTransaction(userId, result === "push" ? "deposit" : "win", payout, user!.balance);
  }

  const session = addSession({
    id: uuid(),
    userId,
    game,
    bet,
    result,
    payout,
    details,
    createdAt: new Date().toISOString(),
  });

  return {
    session,
    balance: getUser(userId)!.balance,
  };
}

router.get("/:userId/history", (req, res) => {
  res.json(getSessionsByUser(req.params.userId));
});

router.post("/:userId/slots", (req, res) => {
  const { bet } = req.body;
  const check = processBet(req.params.userId, bet);
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const game = playSlots(bet);
  const response = processResult(
    req.params.userId,
    "slots",
    bet,
    game.result,
    game.payout,
    { reels: game.reels, combo: game.combo, multiplier: game.multiplier }
  );

  res.json({ ...game, ...response });
});

router.post("/:userId/blackjack", (req, res) => {
  const { bet } = req.body;
  const check = processBet(req.params.userId, bet);
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const game = playBlackjack(bet);
  const response = processResult(
    req.params.userId,
    "blackjack",
    bet,
    game.result,
    game.payout,
    {
      playerHand: game.playerHand,
      dealerHand: game.dealerHand,
      playerScore: game.playerScore,
      dealerScore: game.dealerScore,
    }
  );

  res.json({ ...game, ...response });
});

router.post("/:userId/roulette", (req, res) => {
  const { bet, rouletteBet, bets } = req.body;

  if (Array.isArray(bets) && bets.length > 0) {
    const totalBet = bets.reduce((s: number, b: { amount: number }) => s + b.amount, 0);
    const check = processBet(req.params.userId, totalBet);
    if ("error" in check) {
      res.status(check.status).json({ error: check.error });
      return;
    }

    const game = playRouletteRound(bets);
    const response = processResult(
      req.params.userId,
      "roulette",
      totalBet,
      game.result === "push" ? "push" : game.result,
      game.totalPayout,
      {
        winningNumber: game.winningNumber,
        color: game.color,
        bets: game.bets,
      }
    );

    res.json({ ...game, ...response });
    return;
  }

  const check = processBet(req.params.userId, bet);
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  if (!rouletteBet?.type) {
    res.status(400).json({ error: "Tipo de apuesta requerido" });
    return;
  }

  const game = playRoulette(bet, rouletteBet);
  const response = processResult(
    req.params.userId,
    "roulette",
    bet,
    game.result,
    game.payout,
    {
      winningNumber: game.winningNumber,
      color: game.color,
      bet: game.bet,
    }
  );

  res.json({ ...game, ...response });
});

router.post("/:userId/plinko", (req, res) => {
  const { bet, risk, count = 1 } = req.body;
  const ballCount = Math.min(Math.max(1, Math.floor(count)), 20);

  if (ballCount > 1) {
    const totalBet = bet * ballCount;
    const check = processBet(req.params.userId, totalBet);
    if ("error" in check) {
      res.status(check.status).json({ error: check.error });
      return;
    }

    const game = playPlinkoMulti(ballCount, bet, risk ?? "medium");
    const response = processResult(
      req.params.userId,
      "plinko",
      totalBet,
      game.result === "push" ? "push" : game.result,
      game.totalPayout,
      { risk: game.risk, balls: game.balls }
    );

    res.json({ ...game, ...response });
    return;
  }

  const check = processBet(req.params.userId, bet);
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const game = playPlinko(bet, risk ?? "medium");
  const response = processResult(
    req.params.userId,
    "plinko",
    bet,
    game.result === "push" ? "push" : game.result,
    game.payout,
    {
      risk: game.risk,
      path: game.path,
      slot: game.slot,
      multiplier: game.multiplier,
    }
  );

  res.json({ ...game, ...response });
});

router.post("/:userId/minesweeper/start", (req, res) => {
  const { bet, bombs } = req.body;
  const bombCount = Number(bombs);

  if (getSession(req.params.userId)) {
    res.status(400).json({ error: "Ya tienes una partida activa" });
    return;
  }

  const check = processBet(req.params.userId, Number(bet));
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  try {
    const session = startMinesweeper(req.params.userId, Number(bet), bombCount);
    res.json({
      ...getMinesweeperState(session),
      balance: getUser(req.params.userId)!.balance,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "INVALID_BET") {
      res.status(400).json({ error: "Apuesta inválida ($10 – $200)" });
      return;
    }
    if (code === "INVALID_BOMBS") {
      res.status(400).json({ error: "Bombas inválidas (1 – 24)" });
      return;
    }
    res.status(400).json({ error: "No se pudo iniciar la partida" });
  }
});

router.post("/:userId/minesweeper/reveal", (req, res) => {
  const cell = Number(req.body.cell);

  try {
    const result = revealMinesweeperCell(req.params.userId, cell);
    const { session, hit, increment, secret, bombCells } = result;

    if (hit) {
      addSession({
        id: uuid(),
        userId: req.params.userId,
        game: "minesweeper",
        bet: session.bet,
        result: "loss",
        payout: 0,
        details: {
          bombs: session.bombs,
          revealed: session.revealed,
          bombCells,
          secret,
          hash: session.hash,
        },
        createdAt: new Date().toISOString(),
      });
      clearSession(req.params.userId);

      res.json({
        hit: true,
        secret,
        bombCells,
        revealed: session.revealed,
        balance: getUser(req.params.userId)!.balance,
        profit: -session.bet,
      });
      return;
    }

    if (session.ended) {
      const payout = session.total;
      const user = updateBalance(req.params.userId, payout);
      addTransaction(req.params.userId, "win", payout, user!.balance);
      addSession({
        id: uuid(),
        userId: req.params.userId,
        game: "minesweeper",
        bet: session.bet,
        result: "win",
        payout,
        details: {
          bombs: session.bombs,
          revealed: session.revealed,
          autoCashout: true,
          hash: session.hash,
        },
        createdAt: new Date().toISOString(),
      });
      clearSession(req.params.userId);

      res.json({
        hit: false,
        increment,
        autoCashout: true,
        payout,
        ...getMinesweeperState(session),
        secret: session.secret,
        bombCells: session.bombCells,
        balance: user!.balance,
      });
      return;
    }

    res.json({
      hit: false,
      increment,
      ...getMinesweeperState(session),
      balance: getUser(req.params.userId)!.balance,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NO_GAME") {
      res.status(400).json({ error: "No hay partida activa" });
      return;
    }
    if (code === "ALREADY_REVEALED") {
      res.status(400).json({ error: "Casilla ya revelada" });
      return;
    }
    res.status(400).json({ error: "Casilla inválida" });
  }
});

router.post("/:userId/minesweeper/cashout", (req, res) => {
  try {
    const session = cashoutMinesweeper(req.params.userId);
    const payout = session.total;
    const user = updateBalance(req.params.userId, payout);
    addTransaction(req.params.userId, "win", payout, user!.balance);

    addSession({
      id: uuid(),
      userId: req.params.userId,
      game: "minesweeper",
      bet: session.bet,
      result: "win",
      payout,
      details: {
        bombs: session.bombs,
        revealed: session.revealed,
        cashout: true,
        hash: session.hash,
        secret: session.secret,
      },
      createdAt: new Date().toISOString(),
    });

    clearSession(req.params.userId);

    res.json({
      payout,
      profit: payout - session.bet,
      secret: session.secret,
      bombCells: session.bombCells,
      revealed: session.revealed,
      balance: user!.balance,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NO_GAME") {
      res.status(400).json({ error: "No hay partida activa" });
      return;
    }
    if (code === "NEED_ONE_TILE") {
      res.status(400).json({ error: "Revela al menos una casilla antes de retirar" });
      return;
    }
    res.status(400).json({ error: "No se pudo retirar" });
  }
});

export default router;
