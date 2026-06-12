import "./LoginScreen.css";

interface Props {
  username: string;
  email: string;
  loading: boolean;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const PARTICLES = ["💎", "💰", "🎁", "✨", "💵", "⭐", "🪙", "💳"];

const DEPOSIT_PERKS = [
  { value: "100%", label: "en tu 1er depósito" },
  { value: "$1,000", label: "bono de bienvenida" },
  { value: "0%", label: "comisión crypto" },
];

export default function LoginScreen({
  username,
  email,
  loading,
  onUsernameChange,
  onEmailChange,
  onSubmit,
}: Props) {
  return (
    <div className="login-page">
      <div className="login-bg-slides" aria-hidden="true">
        <div className="login-bg-slide" />
        <div className="login-bg-slide" />
        <div className="login-bg-slide" />
      </div>
      <div className="login-bg-overlay" aria-hidden="true" />

      <div className="login-particles" aria-hidden="true">
        {PARTICLES.map((symbol, i) => (
          <span key={i} className="login-particle">
            {symbol}
          </span>
        ))}
      </div>

      <div className="login-shell">
        <section className="login-hero">
          <div className="login-badge">
            <span className="login-badge-dot" />
            Casino en vivo
          </div>
          <h1 className="login-title">Royal Casino</h1>
          <p className="login-tagline">
            Regístrate hoy y multiplica tu bankroll desde el primer depósito.
          </p>
          <div className="login-promo">
            <p className="login-promo-headline">Bonos en tu primer depósito</p>
            <div className="login-promo-grid">
              {DEPOSIT_PERKS.map((perk) => (
                <div key={perk.label} className="login-promo-item">
                  <span className="login-promo-value">{perk.value}</span>
                  <span className="login-promo-label">{perk.label}</span>
                </div>
              ))}
            </div>
            <p className="login-promo-note">
              Deposita con crypto y recibe crédito extra al instante
            </p>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-glow" aria-hidden="true" />
          <h2>Bienvenido</h2>
          <p className="login-card-sub">Crea tu cuenta y empieza a jugar en segundos</p>

          <form className="login-form" onSubmit={onSubmit}>
            <div className="login-field">
              <label htmlFor="login-username">Nombre de usuario</label>
              <input
                id="login-username"
                placeholder="Tu alias en la mesa"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Abriendo mesa..." : "Comenzar a jugar →"}
            </button>
          </form>

          <div className="login-bonus">
            <span className="login-bonus-icon">🎁</span>
            <div className="login-bonus-text">
              <strong>Bono de bienvenida: $1,000</strong>
              <span>Crédito instantáneo al registrarte</span>
            </div>
          </div>

          <div className="login-trust">
            <span className="login-trust-item">🔒 Seguro</span>
            <span className="login-trust-item">⚡ Instantáneo</span>
            <span className="login-trust-item">🎲 Provably fair</span>
          </div>
        </section>
      </div>
    </div>
  );
}
