import { useCallback, useEffect, useRef, useState } from "react";
import { playPlinko } from "../api";
import "./Plinko.css";
import { MULTIPLIERS, RISK_HINTS, RISK_LABELS, type PlinkoRisk } from "./plinkoData";
import {
  JACKPOT_TI,
  type AnimBall,
  type Layout,
  type PegFlash,
  buildPath,
  computeLayout,
  drawScene,
  stepBall,
} from "./centerDropEngine";
import { type LiveWin, randomLiveWin, seedLiveFeed } from "./plinkoLiveFeed";

interface Props {
  userId: string;
  balance: number;
  onBack: () => void;
  onBalanceChange: () => void;
  onDeposit: () => void;
}

interface PendingDrop {
  id: string;
  totalBet: number;
  ballCount: number;
  settledCount: number;
  finalBalance: number;
  onComplete: () => void;
}

interface RuntimeBall extends AnimBall {
  startTime: number;
  x: number;
  y: number;
  trail: { x: number; y: number }[];
  dropId: string;
  payout: number;
  betShare: number;
  balanceSettled: boolean;
}

interface DropSummary {
  totalPayout: number;
  totalBet: number;
  count: number;
  balance: number;
  net: number;
}

interface SessionStats {
  streak: number;
  bestMult: number;
  biggestWin: number;
}

const BALL_COUNTS = [1, 3, 5, 10] as const;
const MIN_BET = 10;
const MAX_BET = 200;

export default function Plinko({ userId, balance, onBack, onBalanceChange, onDeposit }: Props) {
  const [bet, setBet] = useState(25);
  const [ballCount, setBallCount] = useState(1);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [summary, setSummary] = useState<DropSummary | null>(null);
  const [stats, setStats] = useState<SessionStats>({ streak: 0, bestMult: 0, biggestWin: 0 });
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [lockedBet, setLockedBet] = useState(0);
  const [error, setError] = useState("");
  const [inFlight, setInFlight] = useState(0);
  const [flyingCount, setFlyingCount] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liveFeed, setLiveFeed] = useState<LiveWin[]>(() => seedLiveFeed(6));
  const [toast, setToast] = useState<{ msg: string; type: "win" | "loss" | "info" } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<RuntimeBall[]>([]);
  const pegFlashesRef = useRef<PegFlash[]>([]);
  const layoutRef = useRef<Layout | null>(null);
  const goldPulseRef = useRef(0);
  const highlightedTubeRef = useRef(-1);
  const lastFrameRef = useRef(0);
  const lastFlyingRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPendingRef = useRef(false);
  const dropDebounceRef = useRef(0);
  const pendingDropsRef = useRef<PendingDrop[]>([]);
  const onBalanceChangeRef = useRef(onBalanceChange);
  onBalanceChangeRef.current = onBalanceChange;

  const totalCost = bet * ballCount;
  const availableBalance = displayBalance - lockedBet;
  const canAfford = availableBalance >= totalCost;
  const centerMult = MULTIPLIERS[risk][JACKPOT_TI];

  useEffect(() => {
    if (pendingDropsRef.current.length === 0 && lockedBet === 0) {
      setDisplayBalance(balance);
    }
  }, [balance, lockedBet]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveFeed((prev) => [randomLiveWin(), ...prev].slice(0, 8));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const settleBallBalance = useCallback((ball: RuntimeBall) => {
    const drop = pendingDropsRef.current.find((d) => d.id === ball.dropId);
    if (!drop || ball.balanceSettled) return;

    ball.balanceSettled = true;
    setDisplayBalance((b) => b - ball.betShare + ball.payout);
    setLockedBet((l) => l - ball.betShare);
    drop.settledCount++;

    if (drop.settledCount >= drop.ballCount) {
      setDisplayBalance(drop.finalBalance);
      pendingDropsRef.current = pendingDropsRef.current.filter((d) => d.id !== drop.id);
      drop.onComplete();
      onBalanceChangeRef.current();
    }
  }, []);

  const drawFrame = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;

    const rect = board.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      layoutRef.current = computeLayout(w, h);
    }

    const layout = layoutRef.current ?? computeLayout(w, h);
    layoutRef.current = layout;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dt = lastFrameRef.current ? Math.min(now - lastFrameRef.current, 32) : 16;
    lastFrameRef.current = now;

    if (goldPulseRef.current > 0) {
      goldPulseRef.current = Math.max(0, goldPulseRef.current - dt * 0.0015);
    }

    pegFlashesRef.current = pegFlashesRef.current
      .map((f) => ({ ...f, alpha: f.alpha - dt * 0.004 }))
      .filter((f) => f.alpha > 0.01);

    const flashQueue: PegFlash[] = [];
    let flying = 0;
    const drawBalls: { x: number; y: number; landed: boolean; slot: number; hue: number; trail?: { x: number; y: number }[] }[] = [];
    const nextBalls: RuntimeBall[] = [];

    for (const ball of ballsRef.current) {
      if (ball.landedAt && now - ball.landedAt > 900) continue;

      if (now < ball.startTime) {
        flying++;
        drawBalls.push({ x: ball.x, y: ball.y, landed: false, slot: ball.finalSlot, hue: ball.hue, trail: ball.trail });
        nextBalls.push(ball);
        continue;
      }

      if (!ball.done) {
        const { x, y, landed } = stepBall(ball, dt, flashQueue);
        ball.trail = [...ball.trail, { x: ball.x, y: ball.y }].slice(-10);
        ball.x = x;
        ball.y = y;
        if (landed) {
          ball.done = true;
          ball.landedAt = now;
          highlightedTubeRef.current = ball.finalSlot;
          if (ball.finalSlot === JACKPOT_TI && centerMult >= 1) goldPulseRef.current = 1;
          if (!ball.balanceSettled) settleBallBalance(ball);
        }
        flying++;
      } else {
        const last = ball.path.at(-1)!;
        ball.x = last.x;
        ball.y = last.y;
      }

      drawBalls.push({ x: ball.x, y: ball.y, landed: ball.done, slot: ball.finalSlot, hue: ball.hue, trail: ball.trail });
      nextBalls.push(ball);
    }

    if (flashQueue.length) pegFlashesRef.current = [...pegFlashesRef.current, ...flashQueue];
    ballsRef.current = nextBalls;

    if (flying !== lastFlyingRef.current) {
      lastFlyingRef.current = flying;
      setFlyingCount(flying);
      if (flying === 0 && autoPendingRef.current) {
        autoPendingRef.current = false;
      }
    }

    drawScene(ctx, layout, risk, pegFlashesRef.current, highlightedTubeRef.current, drawBalls, goldPulseRef.current);
  }, [risk, centerMult, settleBallBalance]);

  useEffect(() => {
    let id = 0;
    const loop = (t: number) => {
      drawFrame(t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [drawFrame]);

  function spawnBalls(
    ballsData: { path: ("L" | "R")[]; slot: number; payout?: number }[],
    dropId: string,
    betShare: number
  ) {
    const layout = layoutRef.current;
    if (!layout) return;

    const t0 = performance.now();
    const newBalls: RuntimeBall[] = ballsData.map((data, i) => {
      const path = buildPath(data.path, data.slot, layout);
      const start = path[0];
      return {
        id: `${t0}-${i}`,
        path,
        segIdx: 0,
        segT: 0,
        finalSlot: data.slot,
        hue: i % 7,
        done: false,
        startTime: t0 + i * 140,
        x: start.x,
        y: start.y,
        trail: [],
        dropId,
        payout: data.payout ?? 0,
        betShare,
        balanceSettled: false,
      };
    });
    ballsRef.current = [...ballsRef.current, ...newBalls];
  }

  const handleDrop = useCallback(async (count = ballCount) => {
    const now = Date.now();
    if (now - dropDebounceRef.current < 280) return;
    dropDebounceRef.current = now;

    const cost = bet * count;
    const available = displayBalance - lockedBet;
    if (available < cost) {
      setError("Saldo insuficiente");
      return;
    }

    setError("");
    setInFlight((n) => n + 1);
    try {
      const data = await playPlinko(userId, bet, risk, count);
      const list =
        data.balls?.length > 0 ? data.balls : [{ path: data.path, slot: data.slot, payout: data.payout }];
      const totalBet = data.totalBet ?? cost;
      const totalPayout = data.totalPayout ?? data.payout;
      const net = totalPayout - totalBet;
      const dropId = `drop-${Date.now()}`;
      const betShare = totalBet / list.length;

      const completeDrop = () => {
        setSummary({ totalPayout, totalBet, count: data.count ?? count, balance: data.balance, net });
        const mults = MULTIPLIERS[risk];
        const bestInDrop = Math.max(...list.map((b: { slot: number }) => mults[b.slot]));
        const maxPayout = Math.max(...list.map((b: { payout?: number }) => b.payout ?? 0));
        setStats((s) => ({
          streak: net >= 0 ? s.streak + 1 : 0,
          bestMult: Math.max(s.bestMult, bestInDrop),
          biggestWin: Math.max(s.biggestWin, maxPayout),
        }));
        if (net > 0) setToast({ msg: `+${net.toLocaleString()} ganados`, type: "win" });
        else if (net < 0) setToast({ msg: `${net.toLocaleString()} en este tiro`, type: "loss" });
        else setToast({ msg: "Empate — recuperaste la apuesta", type: "info" });
      };

      pendingDropsRef.current.push({
        id: dropId,
        totalBet,
        ballCount: list.length,
        settledCount: 0,
        finalBalance: data.balance,
        onComplete: completeDrop,
      });
      setLockedBet((l) => l + totalBet);
      spawnBalls(list, dropId, betShare);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al jugar");
    } finally {
      setInFlight((n) => n - 1);
    }
  }, [userId, bet, risk, ballCount, displayBalance, lockedBet]);

  useEffect(() => {
    if (!autoMode || flyingCount > 0 || inFlight > 0) return;
    if (displayBalance - lockedBet < bet * ballCount) return;
    const t = setTimeout(() => handleDrop(ballCount), 600);
    return () => clearTimeout(t);
  }, [autoMode, flyingCount, inFlight, displayBalance, lockedBet, bet, ballCount, handleDrop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (displayBalance - lockedBet >= bet * ballCount) handleDrop(ballCount);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bet, ballCount, displayBalance, lockedBet, inFlight, handleDrop]);

  useEffect(() => () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
  }, []);

  function startHoldDrop(e: React.PointerEvent) {
    e.preventDefault();
    if (!canAfford) return;
    handleDrop(ballCount);
    holdTimerRef.current = setInterval(() => {
      if (displayBalance - lockedBet >= bet * ballCount) handleDrop(ballCount);
    }, 550);
  }

  function stopHoldDrop() {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function adjustBet(delta: number) {
    setBet((b) => Math.min(MAX_BET, Math.max(MIN_BET, b + delta)));
  }

  return (
    <div className="cd-app">
      <header className="cd-topbar">
        <button className="cd-back" onClick={onBack}>← Lobby</button>
        <div className="cd-brand">
          <span className="cd-brand-icon">🎰</span>
          <div>
            <span className="cd-brand-sub">Royal Casino</span>
            <h1>CENTER DROP</h1>
          </div>
        </div>
        <div className="cd-stats-bar">
          <div className="cd-stat">
            <span className="cd-stat-lbl">Racha actual</span>
            <span className="cd-stat-val">{stats.streak} tiros</span>
          </div>
          <div className="cd-stat">
            <span className="cd-stat-lbl">Mejor premio</span>
            <span className="cd-stat-val gold">{stats.bestMult > 0 ? `${stats.bestMult}x` : "—"}</span>
          </div>
          <div className="cd-stat">
            <span className="cd-stat-lbl">Mayor ganancia</span>
            <span className="cd-stat-val cyan">${stats.biggestWin.toLocaleString()}</span>
          </div>
        </div>
        <div className="cd-topbar-right">
          <div className="cd-saldo-block">
            <span className="cd-saldo-lbl">Saldo</span>
            <span className={`cd-saldo-val ${!canAfford ? "low" : ""}`}>${displayBalance.toLocaleString()}</span>
          </div>
          <button className="cd-deposit" onClick={onDeposit}>+ Depositar</button>
        </div>
      </header>

      <div className="cd-main">
        <div className="cd-left">
          <div className="cd-board-wrap" ref={boardRef}>
            <canvas ref={canvasRef} className="cd-board" />
            {flyingCount > 0 && (
              <div className="cd-board-badge">{flyingCount} bolita{flyingCount > 1 ? "s" : ""} en el aire</div>
            )}
            {toast && (
              <div className={`cd-toast cd-toast-${toast.type}`}>{toast.msg}</div>
            )}
          </div>

          <div className="cd-action-bar">
            <button
              type="button"
              className={`cd-auto-btn ${autoMode ? "on" : ""}`}
              onClick={() => setAutoMode((a) => !a)}
            >
              <span className="cd-auto-icon">⟳</span>
              Automático
            </button>

            <button
              type="button"
              className="cd-btn-launch"
              disabled={!canAfford}
              onPointerDown={startHoldDrop}
              onPointerUp={stopHoldDrop}
              onPointerLeave={stopHoldDrop}
              onPointerCancel={stopHoldDrop}
            >
              <span className="cd-launch-icon">🚀</span>
              <span className="cd-launch-text">
                {inFlight > 0 ? "Cayendo…" : ballCount === 1 ? "Lanzar bolita" : `Lanzar ${ballCount}`}
              </span>
              <span className="cd-launch-hint">Mantén para lanzamiento rápido</span>
            </button>

            <button
              type="button"
              className="cd-btn-launch10"
              disabled={availableBalance < bet * 10}
              onClick={() => handleDrop(10)}
            >
              <span className="cd-launch-text">Lanzar 10</span>
              <span className="cd-launch-hint">${(bet * 10).toLocaleString()}</span>
            </button>
          </div>

          <div className="cd-footer-bar">
            <button type="button" className="cd-icon-btn" onClick={() => setMuted((m) => !m)} title="Sonido">
              {muted ? "🔇" : "🔊"}
            </button>
            <span className="cd-footer-info">
              Costo por bolita: <strong>${bet}</strong> · Riesgo: <strong>{RISK_LABELS[risk]}</strong>
            </span>
            {!canAfford && <span className="cd-warn">Saldo insuficiente</span>}
            {error && <span className="cd-error">{error}</span>}
          </div>
        </div>

        <aside className="cd-right">
          <div className="cd-control-card">
            <h3>Panel de control</h3>

            <label className="cd-field-lbl">Apuesta</label>
            <div className="cd-bet-stepper">
              <button type="button" className="cd-step" onClick={() => adjustBet(-5)}>−</button>
              <input
                className="cd-bet-input"
                type="number"
                value={bet}
                min={MIN_BET}
                max={MAX_BET}
                onChange={(e) => setBet(Math.min(MAX_BET, Math.max(MIN_BET, Number(e.target.value) || MIN_BET)))}
              />
              <button type="button" className="cd-step" onClick={() => adjustBet(5)}>+</button>
            </div>

            <label className="cd-field-lbl">Bolitas</label>
            <div className="cd-count-btns">
              {BALL_COUNTS.map((n) => (
                <button
                  key={n}
                  className={`cd-count-btn ${ballCount === n ? "active" : ""}`}
                  onClick={() => setBallCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <label className="cd-field-lbl">Nivel de riesgo</label>
            <p className="cd-risk-hint">{RISK_HINTS[risk]}</p>
            <div className="cd-risk-btns">
              {(["low", "medium", "high"] as PlinkoRisk[]).map((r) => (
                <button
                  key={r}
                  className={`cd-risk-btn r-${r} ${risk === r ? "active" : ""}`}
                  onClick={() => setRisk(r)}
                >
                  {RISK_LABELS[r].toUpperCase()}
                </button>
              ))}
            </div>

            <div className="cd-center-tube">
              <span>Tubo central</span>
              <strong className={centerMult < 1 ? "risk" : "gold"}>{centerMult}x</strong>
            </div>
          </div>

          {summary && (
            <div className={`cd-result ${summary.net >= 0 ? "win" : "loss"}`}>
              <span className="lbl">Último tiro</span>
              <span className="val">{summary.net >= 0 ? "+" : ""}${summary.net.toLocaleString()}</span>
            </div>
          )}

          <div className="cd-live-feed">
            <h3>
              <span className="cd-live-dot" />
              Actividad en vivo
            </h3>
            <div className="cd-live-list">
              {liveFeed.map((w) => (
                <div key={w.id} className="cd-live-row">
                  <span className="cd-live-name">{w.name}</span>
                  <span className="cd-live-desc">ganó {w.mult}x</span>
                  <span className="cd-live-amt">${w.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
