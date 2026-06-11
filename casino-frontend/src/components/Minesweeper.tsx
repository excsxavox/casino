import { useState } from "react";
import {
  cashoutMinesweeper,
  revealMinesweeperCell,
  startMinesweeper,
} from "../api";
import "./Minesweeper.css";

interface Props {
  userId: string;
  balance: number;
  onBack: () => void;
  onBalanceChange: () => void;
}

const MIN_BET = 10;
const MAX_BET = 200;
const GRID_SIZE = 25;

type GamePhase = "idle" | "playing" | "ended";

export default function Minesweeper({
  userId,
  balance,
  onBack,
  onBalanceChange,
}: Props) {
  const [bet, setBet] = useState(20);
  const [bombs, setBombs] = useState(5);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [hash, setHash] = useState("-");
  const [secret, setSecret] = useState("-");
  const [revealed, setRevealed] = useState<number[]>([]);
  const [bombCells, setBombCells] = useState<number[]>([]);
  const [next, setNext] = useState(0);
  const [cashout, setCashout] = useState(0);
  const [profit, setProfit] = useState(0);
  const [resultMsg, setResultMsg] = useState<{ type: "win" | "loss"; text: string } | null>(
    null
  );

  const maxBet = Math.min(balance, MAX_BET);
  const controlsLocked = phase === "playing" || loading;

  function resetRound() {
    setPhase("idle");
    setRevealed([]);
    setBombCells([]);
    setNext(0);
    setCashout(0);
    setProfit(0);
    setSecret("-");
    setHash("-");
    setResultMsg(null);
    setError("");
  }

  async function handleStart() {
    setLoading(true);
    setError("");
    setResultMsg(null);
    try {
      const data = await startMinesweeper(userId, bet, bombs);
      setPhase("playing");
      setRevealed(data.revealed);
      setHash(data.hash);
      setSecret("-");
      setBombCells([]);
      setNext(data.next);
      setCashout(data.total);
      setProfit(data.profit);
      onBalanceChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al apostar");
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal(cell: number) {
    if (phase !== "playing" || loading || revealed.includes(cell)) return;

    setLoading(true);
    setError("");
    try {
      const data = await revealMinesweeperCell(userId, cell);

      if (data.hit) {
        setPhase("ended");
        setRevealed(data.revealed);
        setBombCells(data.bombCells ?? []);
        setSecret(data.secret ?? "-");
        setNext(0);
        setCashout(0);
        setProfit(data.profit ?? -bet);
        setResultMsg({ type: "loss", text: "¡Bomba! Perdiste la apuesta." });
        onBalanceChange();
        return;
      }

      setRevealed(data.revealed);
      setNext(data.next);
      setCashout(data.total);
      setProfit(data.profit);

      if (data.autoCashout) {
        setPhase("ended");
        setBombCells(data.bombCells ?? []);
        setSecret(data.secret ?? "-");
        setResultMsg({
          type: "win",
          text: `¡Tablero completo! Ganaste $${data.payout?.toFixed(2)}`,
        });
        onBalanceChange();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al revelar");
    } finally {
      setLoading(false);
    }
  }

  async function handleCashout() {
    if (phase !== "playing" || loading) return;

    setLoading(true);
    setError("");
    try {
      const data = await cashoutMinesweeper(userId);
      setPhase("ended");
      setRevealed(data.revealed);
      setBombCells(data.bombCells ?? []);
      setSecret(data.secret ?? "-");
      setNext(0);
      setCashout(data.payout);
      setProfit(data.profit);
      setResultMsg({
        type: "win",
        text: `Retiro exitoso: $${data.payout.toFixed(2)}`,
      });
      onBalanceChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al retirar");
    } finally {
      setLoading(false);
    }
  }

  function adjustBet(action: "half" | "double" | "max") {
    if (controlsLocked) return;
    if (action === "half") setBet((b) => Math.max(MIN_BET, Math.floor(b / 2)));
    if (action === "double") setBet((b) => Math.min(maxBet, b * 2));
    if (action === "max") setBet(Math.max(MIN_BET, maxBet));
  }

  function cellContent(cell: number): string {
    if (bombCells.includes(cell)) return "💣";
    if (revealed.includes(cell)) return "💎";
    return "";
  }

  function cellClass(cell: number): string {
    const classes = ["ms-cell"];
    if (phase !== "playing") classes.push("ms-cell-disabled");
    if (revealed.includes(cell) && !bombCells.includes(cell)) classes.push("ms-cell-safe");
    if (bombCells.includes(cell)) classes.push("ms-cell-bomb");
    return classes.join(" ");
  }

  return (
    <div className="ms-app">
      <div className="ms-header">
        <button className="ms-back" onClick={onBack}>
          ← Volver al lobby
        </button>
        <h2>💣 Minesweeper</h2>
      </div>

      <div className="ms-fair">
        <div>
          <p>Round hash:</p>
          <span>{hash}</span>
        </div>
        <div>
          <p>Round secret:</p>
          <span>{secret}</span>
        </div>
      </div>

      <div className="ms-layout">
        <div className="ms-panel">
          <h4>Place your bet</h4>
          <div className="ms-input-wrap">
            <input
              type="number"
              value={bet}
              min={MIN_BET}
              max={maxBet}
              step={1}
              disabled={controlsLocked}
              onChange={(e) => setBet(Number(e.target.value))}
            />
            <div className="ms-shortcuts">
              <button type="button" disabled={controlsLocked} onClick={() => adjustBet("half")}>
                1/2
              </button>
              <button type="button" disabled={controlsLocked} onClick={() => adjustBet("double")}>
                x2
              </button>
              <button type="button" disabled={controlsLocked} onClick={() => adjustBet("max")}>
                Max
              </button>
            </div>
          </div>

          <h4>Bombs amount</h4>
          <input
            className="ms-bombs-input"
            type="number"
            value={bombs}
            min={1}
            max={24}
            disabled={controlsLocked}
            onChange={(e) => setBombs(Number(e.target.value))}
          />

          {phase !== "playing" ? (
            <button
              className="ms-btn ms-btn-bet"
              disabled={loading || bet < MIN_BET || bet > maxBet}
              onClick={phase === "ended" ? () => { resetRound(); handleStart(); } : handleStart}
            >
              {loading ? "..." : phase === "ended" ? "Jugar de nuevo" : "Place bet"}
            </button>
          ) : (
            <button
              className="ms-btn ms-btn-cashout"
              disabled={loading || revealed.length === 0}
              onClick={handleCashout}
            >
              {loading ? "..." : "Cashout"}
            </button>
          )}

          {error && <p className="ms-error">{error}</p>}
        </div>

        <div className="ms-board">
          <div className="ms-grid">
            {Array.from({ length: GRID_SIZE }, (_, i) => i + 1).map((cell) => (
              <button
                key={cell}
                type="button"
                className={cellClass(cell)}
                disabled={phase !== "playing" || revealed.includes(cell) || loading}
                onClick={() => handleReveal(cell)}
              >
                {cellContent(cell)}
              </button>
            ))}
          </div>

          <div className="ms-stats">
            <div className="ms-stat">
              <p>Next</p>
              <span>{next.toFixed(2)}</span>
            </div>
            <div className="ms-stat">
              <p>Cashout</p>
              <span>{cashout.toFixed(2)}</span>
            </div>
            <div className="ms-stat">
              <p>Total profit</p>
              <span>{profit.toFixed(2)}</span>
            </div>
          </div>

          {resultMsg && (
            <div className={`ms-result ${resultMsg.type}`}>{resultMsg.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}
