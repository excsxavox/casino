import type { GameInfo } from "../api";
import HeroCarousel from "./HeroCarousel";
import "./Lobby.css";

type View = "slots" | "blackjack" | "roulette" | "plinko" | "minesweeper";

interface Props {
  username: string;
  balance: number;
  games: GameInfo[];
  onSelectGame: (id: View) => void;
  onDeposit: () => void;
}

const GAME_META: Record<
  string,
  { image: string; tag?: string; desc: string; accent: string }
> = {
  slots: {
    image: "/game-images/slots.png",
    tag: "Popular",
    desc: "3 carretes · multiplicadores hasta x50",
    accent: "#e8c547",
  },
  blackjack: {
    image: "/game-images/blackjack.png",
    desc: "Clásico 21 contra la casa",
    accent: "#2ecc71",
  },
  roulette: {
    image: "/game-images/roulette.png",
    tag: "Clásico",
    desc: "Rojo, negro o tu número de la suerte",
    accent: "#e74c3c",
  },
  plinko: {
    image: "/game-images/plinko.png",
    tag: "Hot",
    desc: "Deja caer la bola y multiplica",
    accent: "#00d4ff",
  },
  minesweeper: {
    image: "/game-images/minesweeper.png",
    tag: "Nuevo",
    desc: "Evita bombas y retira a tiempo",
    accent: "#3dd179",
  },
};

export default function Lobby({ username, balance, games, onSelectGame, onDeposit }: Props) {
  return (
    <div className="lobby">
      <HeroCarousel />

      <div className="lobby-top">
        <div className="lobby-welcome">
          <span className="lobby-eyebrow">Tu mesa te espera</span>
          <h2>
            Hola, <span className="lobby-username">{username}</span>
          </h2>
          <p className="lobby-sub">Elige un juego y empieza a ganar</p>
        </div>

        <button type="button" className="lobby-deposit-banner" onClick={onDeposit}>
          <div className="lobby-deposit-glow" aria-hidden="true" />
          <span className="lobby-deposit-icon">🎁</span>
          <div className="lobby-deposit-copy">
            <strong>100% en tu primer depósito</strong>
            <span>Deposita ahora · Saldo: ${balance.toLocaleString()}</span>
          </div>
          <span className="lobby-deposit-cta">Depositar →</span>
        </button>
      </div>

      <div className="lobby-section-head">
        <div>
          <h3>Juegos de la casa</h3>
          <p>House games con pagos instantáneos</p>
        </div>
        <span className="lobby-count">{games.length} juegos</span>
      </div>

      <div className="game-grid">
        {games.map((game) => {
          const meta = GAME_META[game.id] ?? {
            image: "/game-images/slots.png",
            desc: "Juega ahora",
            accent: "#e8c547",
          };

          return (
            <article
              key={game.id}
              className="game-card"
              style={{ "--game-accent": meta.accent } as React.CSSProperties}
              onClick={() => onSelectGame(game.id as View)}
              onKeyDown={(e) => e.key === "Enter" && onSelectGame(game.id as View)}
              role="button"
              tabIndex={0}
            >
              {meta.tag && <span className="game-tag">{meta.tag}</span>}
              <div className="game-card-glow" aria-hidden="true" />
              <div className="game-thumb">
                <img src={meta.image} alt={game.name} className="game-thumb-img" draggable={false} />
                <div className="game-thumb-shade" aria-hidden="true" />
              </div>
              <div className="game-card-body">
                <h4>{game.name}</h4>
                <p className="game-desc">{meta.desc}</p>
                <div className="game-meta">
                  <span>${game.minBet} – ${game.maxBet}</span>
                </div>
                <span className="game-play-btn">Jugar ahora</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
