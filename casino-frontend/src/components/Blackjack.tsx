import { useState } from "react";
import { playBlackjack } from "../api";

interface Props {
  userId: string;
  onBack: () => void;
  onBalanceChange: () => void;
}

export default function Blackjack({ userId, onBack, onBalanceChange }: Props) {
  const [bet, setBet] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<{
    playerHand: string[];
    dealerHand: string[];
    playerScore: number;
    dealerScore: number;
    result: string;
    payout: number;
    balance: number;
  } | null>(null);
  const [error, setError] = useState("");

  async function handlePlay() {
    setPlaying(true);
    setError("");
    setResult(null);
    try {
      const data = await playBlackjack(userId, bet);
      setResult(data);
      onBalanceChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setPlaying(false);
    }
  }

  const resultText =
    result?.result === "win" ? "¡Ganaste!" :
    result?.result === "push" ? "Empate" : "Perdiste";

  return (
    <div className="game-view">
      <button className="back-btn" onClick={onBack}>← Volver al lobby</button>
      <h2>🃏 Blackjack</h2>

      {result && (
        <div className="bj-table">
          <div className="hand">
            <h4>Dealer ({result.dealerScore})</h4>
            <div className="cards">
              {result.dealerHand.map((c, i) => (
                <span key={i} className="card">{c}</span>
              ))}
            </div>
          </div>
          <div className="hand">
            <h4>Tú ({result.playerScore})</h4>
            <div className="cards">
              {result.playerHand.map((c, i) => (
                <span key={i} className="card">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bet-controls">
        <label>Apuesta:</label>
        <input
          type="number"
          value={bet}
          min={25}
          max={1000}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        <button className="btn-gold" onClick={handlePlay} disabled={playing}>
          {playing ? "Repartiendo..." : "Repartir"}
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {result && (
        <div className={`result-box ${result.result}`}>
          <h3>{resultText}</h3>
          {result.payout > 0 && <p>Premio: ${result.payout}</p>}
          <p>Saldo: ${result.balance.toLocaleString()}</p>
        </div>
      )}

      <style>{`
        .bj-table {
          background: #1a472a;
          border: 3px solid var(--gold-dark);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
        }
        .hand { margin-bottom: 20px; }
        .hand h4 { color: var(--gold-light); margin-bottom: 8px; }
        .cards { display: flex; gap: 8px; flex-wrap: wrap; }
        .card {
          background: white;
          color: #111;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
}
