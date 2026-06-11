import { useCallback, useEffect, useState } from "react";
import type { Session, Stats, Transaction, User } from "./api";
import { getSessions, getStats, getTransactions, getUsers } from "./api";
import "./App.css";

type Tab = "dashboard" | "users" | "sessions" | "transactions";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const refresh = useCallback(async () => {
    const [s, u, se, t] = await Promise.all([
      getStats(),
      getUsers(),
      getSessions(),
      getTransactions(),
    ]);
    setStats(s);
    setUsers(u);
    setSessions(se);
    setTransactions(t);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "users", label: "Usuarios", icon: "👥" },
    { id: "sessions", label: "Partidas", icon: "🎮" },
    { id: "transactions", label: "Transacciones", icon: "💳" },
  ];

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>🎰</span>
          <h1>Casino Admin</h1>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <button className="refresh-btn" onClick={refresh}>↻ Actualizar</button>
      </aside>

      <main className="content">
        {tab === "dashboard" && stats && (
          <div>
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <StatCard label="Usuarios" value={stats.totalUsers} icon="👥" />
              <StatCard label="Partidas jugadas" value={stats.totalGames} icon="🎮" />
              <StatCard label="Total apostado" value={`$${stats.totalBets.toLocaleString()}`} icon="💰" />
              <StatCard label="Total pagado" value={`$${stats.totalPayouts.toLocaleString()}`} icon="🏆" />
              <StatCard
                label="Ventaja de la casa"
                value={`$${stats.houseEdge.toLocaleString()}`}
                icon="📈"
                highlight={stats.houseEdge > 0 ? "success" : "danger"}
              />
            </div>
          </div>
        )}

        {tab === "users" && (
          <div>
            <h2>Usuarios ({users.length})</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Saldo</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.email}</td>
                      <td className="money">${u.balance.toLocaleString()}</td>
                      <td className="muted">{new Date(u.createdAt).toLocaleString("es")}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="empty">Sin usuarios registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "sessions" && (
          <div>
            <h2>Partidas ({sessions.length})</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Juego</th>
                    <th>Apuesta</th>
                    <th>Resultado</th>
                    <th>Premio</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.game}</td>
                      <td className="money">${s.bet}</td>
                      <td><span className={`badge ${s.result}`}>{s.result}</span></td>
                      <td className="money">${s.payout}</td>
                      <td className="muted">{new Date(s.createdAt).toLocaleString("es")}</td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr><td colSpan={5} className="empty">Sin partidas registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "transactions" && (
          <div>
            <h2>Transacciones ({transactions.length})</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Saldo después</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td><span className={`badge type-${t.type}`}>{t.type}</span></td>
                      <td className="money">${t.amount}</td>
                      <td className="money">${t.balanceAfter.toLocaleString()}</td>
                      <td className="muted">{new Date(t.createdAt).toLocaleString("es")}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={4} className="empty">Sin transacciones</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: string;
  highlight?: "success" | "danger";
}) {
  return (
    <div className={`stat-card ${highlight ?? ""}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}
