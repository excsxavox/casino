import { useCallback, useState } from "react";
import { playRouletteRound } from "../api";
import RouletteWheel from "./RouletteWheel";
import "./Roulette.css";
import {
  BET_SPOTS,
  CHIPS,
  NUMBER_GRID,
  WHEEL_ORDER,
  getNumberColor,
  spotToApiBet,
} from "./rouletteData";

interface Props {
  userId: string;
  balance: number;
  onBack: () => void;
  onBalanceChange: () => void;
  onDeposit: () => void;
}

interface HistoryEntry {
  number: number | "00";
  color: "red" | "black" | "green";
}

const CHIP_CLASS: Record<number, string> = {
  1: "c1", 5: "c5", 25: "c25", 100: "c100", 500: "c500",
};

export default function Roulette({ userId, balance, onBack, onBalanceChange, onDeposit }: Props) {
  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [placedBets, setPlacedBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [winFlash, setWinFlash] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [winningIndex, setWinningIndex] = useState<number | undefined>();

  const totalBet = Object.values(placedBets).reduce((s, v) => s + v, 0);

  const placeBet = useCallback((spotId: string) => {
    if (spinning) return;
    setPlacedBets((prev) => ({
      ...prev,
      [spotId]: (prev[spotId] ?? 0) + selectedChip,
    }));
  }, [selectedChip, spinning]);

  function clearBets() {
    if (spinning) return;
    setPlacedBets({});
  }

  function repeatBets() {
    if (spinning || Object.keys(lastBets).length === 0) return;
    setPlacedBets({ ...lastBets });
  }

  async function handleSpin() {
    if (spinning || totalBet === 0) return;
    if (totalBet > balance) {
      setError("Saldo insuficiente");
      return;
    }

    setSpinning(true);
    setError("");
    setWinningIndex(undefined);

    const bets = Object.entries(placedBets).map(([spotId, amount]) => ({
      amount,
      rouletteBet: spotToApiBet(BET_SPOTS[spotId]),
    }));

    try {
      const data = await playRouletteRound(userId, bets);
      setLastBets({ ...placedBets });
      setPlacedBets({});

      const idx = WHEEL_ORDER.indexOf(data.winningNumber);
      setWinningIndex(idx);

      setTimeout(() => {
        const color = data.color as HistoryEntry["color"];
        setHistory((prev) => [
          { number: data.winningNumber, color },
          ...prev.slice(0, 8),
        ]);
        if (data.totalPayout > data.totalBet) {
          setWinFlash(data.totalPayout);
          setTimeout(() => setWinFlash(null), 1500);
        }
        setSpinning(false);
        onBalanceChange();
      }, 4000);
    } catch (err) {
      setSpinning(false);
      setError(err instanceof Error ? err.message : "Error al girar");
    }
  }

  function renderChipOnCell(amount: number) {
    const chipValue = CHIPS.find((c) => c === amount) ?? amount;
    return (
      <div className={`rl-chip-on-cell ${CHIP_CLASS[chipValue] ?? "c25"}`}>
        {amount >= 1000 ? `${amount / 1000}k` : amount}
      </div>
    );
  }

  return (
    <div className="rl-screen">
      {winFlash !== null && (
        <div className="rl-win-flash">
          <h2>¡Ganaste ${winFlash.toLocaleString()}!</h2>
        </div>
      )}

      <header className="rl-topbar">
        <div className="rl-topbar-left">
          <button className="rl-back" onClick={onBack}>← Lobby</button>
          <div className="rl-balance-box">
            <span className="rl-coin">🪙</span>
            <span className="rl-balance-amount">{balance.toLocaleString()}</span>
            <button className="rl-deposit-btn" onClick={onDeposit}>+</button>
          </div>
        </div>
        <div className="rl-topbar-right">
          <button className="rl-icon-btn" title="Ayuda">?</button>
          <button className="rl-icon-btn" title="Sonido">🔊</button>
          <button className="rl-icon-btn" title="Ajustes">⚙</button>
          <div className="rl-jackpot">
            <div className="rl-jackpot-label">JACKPOT</div>
            <div className="rl-jackpot-value">125,000</div>
          </div>
        </div>
      </header>

      <div className="rl-main">
        <aside className="rl-sidebar">
          <div className="rl-history-label">HISTORIAL</div>
          <div className="rl-history-list">
            {history.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rl-history-item black" style={{ opacity: 0.2 }}>–</div>
                ))
              : history.map((h, i) => (
                  <div key={i} className={`rl-history-item ${h.color}`}>
                    {h.number}
                  </div>
                ))}
          </div>
          <button className="rl-side-btn">
            <span>⭐</span>
            FAVORITOS
          </button>
          <button className="rl-side-btn">
            <span>📊</span>
            ESTADÍSTICAS
          </button>
        </aside>

        <div className="rl-center">
          <div className="rl-wheel-row">
            <div className="rl-wheel-area">
              <RouletteWheel spinning={spinning} winningIndex={winningIndex} />
            </div>
            <div className="rl-chip-stacks">
              {(["green", "red", "purple", "blue"] as const).map((color) => (
                <div key={color} className={`rl-chip-stack s-${color}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="chip-disc" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="rl-table-wrap">
            <div className="rl-table">
              <div className="rl-table-grid">
                <div className="rl-zero-col">
                  <div
                    className={`rl-cell green ${placedBets["n-0"] ? "has-bet" : ""}`}
                    onClick={() => placeBet("n-0")}
                  >
                    0
                    {placedBets["n-0"] && renderChipOnCell(placedBets["n-0"])}
                  </div>
                  <div
                    className={`rl-cell green ${placedBets["n-00"] ? "has-bet" : ""}`}
                    onClick={() => placeBet("n-00")}
                  >
                    00
                    {placedBets["n-00"] && renderChipOnCell(placedBets["n-00"])}
                  </div>
                </div>

                {NUMBER_GRID.map((row, rowIdx) =>
                  row.map((num, colIdx) => (
                    <div
                      key={num}
                      className={`rl-cell ${getNumberColor(num)} ${placedBets[`n-${num}`] ? "has-bet" : ""}`}
                      style={{ gridRow: rowIdx + 1, gridColumn: colIdx + 2 }}
                      onClick={() => placeBet(`n-${num}`)}
                    >
                      {num}
                      {placedBets[`n-${num}`] && renderChipOnCell(placedBets[`n-${num}`])}
                    </div>
                  ))
                )}

                {[1, 2, 3].map((col) => (
                  <div
                    key={col}
                    className={`rl-cell outside ${placedBets[`col-${col}`] ? "has-bet" : ""}`}
                    style={{ gridRow: col, gridColumn: 14 }}
                    onClick={() => placeBet(`col-${col}`)}
                  >
                    2:1
                    {placedBets[`col-${col}`] && renderChipOnCell(placedBets[`col-${col}`])}
                  </div>
                ))}
              </div>

              <div className="rl-dozen-row">
                {(["1ST 12", "2ND 12", "3RD 12"] as const).map((label, i) => (
                  <div
                    key={label}
                    className={`rl-cell outside ${placedBets[`dozen-${i + 1}`] ? "has-bet" : ""}`}
                    onClick={() => placeBet(`dozen-${i + 1}`)}
                  >
                    {label}
                    {placedBets[`dozen-${i + 1}`] && renderChipOnCell(placedBets[`dozen-${i + 1}`])}
                  </div>
                ))}
              </div>

              <div className="rl-outside-row">
                <div
                  className={`rl-cell outside ${placedBets.low ? "has-bet" : ""}`}
                  onClick={() => placeBet("low")}
                >
                  1 TO 18
                  {placedBets.low && renderChipOnCell(placedBets.low)}
                </div>
                <div
                  className={`rl-cell outside ${placedBets.even ? "has-bet" : ""}`}
                  onClick={() => placeBet("even")}
                >
                  EVEN
                  {placedBets.even && renderChipOnCell(placedBets.even)}
                </div>
                <div
                  className={`rl-cell outside ${placedBets.red ? "has-bet" : ""}`}
                  onClick={() => placeBet("red")}
                >
                  <div className="rl-diamond red" />
                  {placedBets.red && renderChipOnCell(placedBets.red)}
                </div>
                <div
                  className={`rl-cell outside ${placedBets.black ? "has-bet" : ""}`}
                  onClick={() => placeBet("black")}
                >
                  <div className="rl-diamond black" />
                  {placedBets.black && renderChipOnCell(placedBets.black)}
                </div>
                <div
                  className={`rl-cell outside ${placedBets.odd ? "has-bet" : ""}`}
                  onClick={() => placeBet("odd")}
                >
                  ODD
                  {placedBets.odd && renderChipOnCell(placedBets.odd)}
                </div>
                <div
                  className={`rl-cell outside ${placedBets.high ? "has-bet" : ""}`}
                  onClick={() => placeBet("high")}
                >
                  19 TO 36
                  {placedBets.high && renderChipOnCell(placedBets.high)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="rl-error">{error}</p>}

      <div className="rl-controls">
        <div className="rl-chips">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              className={`rl-chip ${CHIP_CLASS[chip]} ${selectedChip === chip ? "selected" : ""}`}
              onClick={() => setSelectedChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="rl-actions">
          <button className="rl-action-btn" onClick={clearBets} disabled={spinning}>
            <span className="icon">↺</span>
            BORRAR
          </button>
          <button className="rl-action-btn" onClick={repeatBets} disabled={spinning}>
            <span className="icon">⟲</span>
            REPETIR
          </button>
          <button
            className="rl-spin-btn"
            onClick={handleSpin}
            disabled={spinning || totalBet === 0}
          >
            <div className="spin-label">{spinning ? "GIRANDO..." : "GIRAR"}</div>
            <div className="spin-hint">MANTENER PARA GIRO AUTOMÁTICO</div>
          </button>
        </div>
      </div>
    </div>
  );
}
