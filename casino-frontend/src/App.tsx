import { useCallback, useEffect, useState } from "react";
import type { GameInfo, User } from "./api";
import { createUser, getGames, getUser } from "./api";
import Blackjack from "./components/Blackjack";
import DepositModal from "./components/DepositModal";
import Lobby from "./components/Lobby";
import LoginScreen from "./components/LoginScreen";
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
      <LoginScreen
        username={username}
        email={email}
        loading={loading}
        onUsernameChange={setUsername}
        onEmailChange={setEmail}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className={`app ${view === "lobby" ? "app-lobby" : ""} ${view === "roulette" ? "app-roulette" : ""} ${view === "plinko" ? "app-plinko" : ""}`}>
      {view !== "roulette" && view !== "plinko" && (
        <header className="header">
          <div className="header-left">
            <button type="button" onClick={() => setView("lobby")} className="logo">
              <span className="logo-icon">♛</span>
              Royal Casino
            </button>
          </div>
          <div className="header-right">
            <div className="balance-pill">
              <span className="balance-label">Saldo</span>
              <span className="balance">${user.balance.toLocaleString()}</span>
            </div>
            <button className="btn-deposit" onClick={openDeposit}>
              + Depositar
            </button>
          </div>
        </header>
      )}

      <main className={view === "roulette" ? "main-roulette" : view === "plinko" ? "main-plinko" : "main"}>
        {view === "lobby" && (
          <Lobby
            username={user.username}
            balance={user.balance}
            games={games}
            onSelectGame={(id) => setView(id)}
            onDeposit={openDeposit}
          />
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
