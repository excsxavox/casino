import { useState } from "react";
import { playSlots } from "../api";

interface Props {
  userId: string;
  onBack: () => void;
  onBalanceChange: () => void;
}

export default function Slots({ userId, onBack, onBalanceChange }: Props) {
  const [bet, setBet] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    reels: string[];
    payout: number;
    result: string;
    balance: number;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleSpin() {
    setSpinning(true);
    setError("");
    setResult(null);
    try {
      const data = await playSlots(userId, bet);
      setResult(data);
      onBalanceChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSpinning(false);
    }
  }

  return (
    <div className="game-view">
      <button className="back-btn" onClick={onBack}>← Volver al lobby</button>
      <h2>🎰 Tragamonedas</h2>

      <div className="slots-machine">
        <div className="reels">
          {(result?.reels ?? ["❓", "❓", "❓"]).map((symbol, i) => (
            <div key={i} className={`reel ${spinning ? "spinning" : ""}`}>
              {symbol}
            </div>
          ))}
        </div>
      </div>

      <div className="bet-controls">
        <label>Apuesta:</label>
        <input
          type="number"
          value={bet}
          min={10}
          max={500}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        <button className="btn-gold" onClick={handleSpin} disabled={spinning}>
          {spinning ? "Girando..." : "¡Girar!"}
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {result && (
        <div className={`result-box ${result.result}`}>
          <h3>{result.result === "win" ? "¡Ganaste!" : "Sin suerte"}</h3>
          {result.payout > 0 && <p>Premio: ${result.payout}</p>}
          <p>Saldo: ${result.balance.toLocaleString()}</p>
        </div>
      )}

      <style>{`
        .slots-machine {
          background: var(--bg-card);
          border: 2px solid var(--gold-dark);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
        }
        .reels {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .reel {
          width: 90px;
          height: 90px;
          background: var(--bg-dark);
          border: 2px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
        }
        .reel.spinning {
          animation: spin 0.3s ease-in-out infinite;
        }
        @keyframes spin {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
