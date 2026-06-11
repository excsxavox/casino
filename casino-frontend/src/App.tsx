import { useCallback, useEffect, useState } from "react";
import type { GameInfo, User } from "./api";
import { createUser, getGames, getUser } from "./api";
import Blackjack from "./components/Blackjack";
import DepositModal from "./components/DepositModal";
import HeroCarousel from "./components/HeroCarousel";
import Minesweeper from "./components/Minesweeper";
import Plinko from "./components/Plinko";
import Roulette from "./components/Roulette";
import Slots from "./components/Slots";
import "./App.css";

type View = "lobby" | "slots" | "blackjack" | "roulette" | "plinko" | "minesweeper";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [view, setView] = useState<View>("lobby");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem("casino_user_id");
    if (savedId) {
      getUser(savedId).then(setUser).catch(() => localStorage.removeItem("casino_user_id"));
    }
    getGames().then(setGames);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const newUser = await createUser(username, email);
      localStorage.setItem("casino_user_id", newUser.id);
      setUser(newUser);
    } finally {
      setLoading(false);
    }
  }

  function openDeposit() {
    setShowDeposit(true);
  }

  const refreshBalance = useCallback(async () => {
    if (!user) return;
    const updated = await getUser(user.id);
    setUser(updated);
  }, [user]);

  const handleDepositSuccess = useCallback(async () => {
    if (!user) return;
    const updated = await getUser(user.id);
    setUser(updated);
  }, [user]);

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>🎰 Royal Casino</h1>
          <p className="subtitle">Entra y prueba tu suerte</p>
          <form onSubmit={handleLogin}>
            <input
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-gold" disabled={loading}>
              {loading ? "Entrando..." : "Comenzar a jugar"}
            </button>
          </form>
          <p className="bonus">Recibes $1,000 de bienvenida</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${view === "roulette" ? "app-roulette" : ""} ${view === "plinko" ? "app-plinko" : ""}`}>
      {view !== "roulette" && view !== "plinko" && (
        <header className="header">
          <div className="header-left">
            <h1 onClick={() => setView("lobby")} className="logo">🎰 Royal Casino</h1>
          </div>
          <div className="header-right">
            <span className="balance">💰 ${user.balance.toLocaleString()}</span>
            <button className="btn-outline" onClick={openDeposit}>+ Depositar</button>
          </div>
        </header>
      )}

      <main className={view === "roulette" ? "main-roulette" : view === "plinko" ? "main-plinko" : "main"}>
        {view === "lobby" && (
          <div className="lobby">
            <HeroCarousel />
            <h2>Juegos disponibles</h2>
            <p className="welcome">Bienvenido, <strong>{user.username}</strong></p>
            <div className="game-grid">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="game-card"
                  onClick={() => setView(game.id as View)}
                >
                  <div className="game-icon">
                    {game.id === "slots" && "🎰"}
                    {game.id === "blackjack" && "🃏"}
                    {game.id === "roulette" && "🎯"}
                    {game.id === "plinko" && "🔻"}
                    {game.id === "minesweeper" && "💣"}
                  </div>
                  <h3>{game.name}</h3>
                  <p>Apuesta: ${game.minBet} – ${game.maxBet}</p>
                  <button className="btn-gold">Jugar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "slots" && (
          <Slots userId={user.id} onBack={() => setView("lobby")} onBalanceChange={refreshBalance} />
        )}
        {view === "blackjack" && (
          <Blackjack userId={user.id} onBack={() => setView("lobby")} onBalanceChange={refreshBalance} />
        )}
        {view === "roulette" && (
          <Roulette
            userId={user.id}
            balance={user.balance}
            onBack={() => setView("lobby")}
            onBalanceChange={refreshBalance}
            onDeposit={openDeposit}
          />
        )}
        {view === "plinko" && (
          <Plinko
            userId={user.id}
            balance={user.balance}
            onBack={() => setView("lobby")}
            onBalanceChange={refreshBalance}
            onDeposit={openDeposit}
          />
        )}
        {view === "minesweeper" && (
          <Minesweeper
            userId={user.id}
            balance={user.balance}
            onBack={() => setView("lobby")}
            onBalanceChange={refreshBalance}
          />
        )}
      </main>

      {showDeposit && (
        <DepositModal
          userId={user.id}
          onClose={() => setShowDeposit(false)}
          onSuccess={handleDepositSuccess}
        />
      )}
    </div>
  );
}
