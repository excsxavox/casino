import { useEffect, useState } from "react";
import {
  confirmCryptoDemo,
  createCryptoCheckout,
  getCryptoConfig,
  getCryptoCurrencies,
  getCryptoPayment,
  type CryptoCurrency,
  type CryptoPayment,
} from "../api";
import "./DepositModal.css";

interface Props {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "form" | "paying" | "success";

const PRESETS = [50, 100, 250, 500];

export default function DepositModal({ userId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState(100);
  const [currency, setCurrency] = useState<CryptoCurrency>("usdttrc20");
  const [currencies, setCurrencies] = useState<
    { id: CryptoCurrency; label: string; symbol: string }[]
  >([]);
  const [payment, setPayment] = useState<CryptoPayment | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCryptoConfig()
      .then((cfg) => setIsDemo(cfg.demo))
      .catch(() => {});
    getCryptoCurrencies().then(setCurrencies).catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== "paying" || !payment) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getCryptoPayment(payment.id, userId);
        setPayment(updated);
        if (updated.status === "finished" && updated.credited) {
          setStep("success");
          onSuccess();
        }
      } catch {
        /* ignore poll errors */
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [step, payment, userId, onSuccess]);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await createCryptoCheckout(userId, amount, currency);
      setPayment(result.payment);
      setIsDemo(result.demo);
      setStep("paying");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el pago");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoConfirm() {
    if (!payment) return;
    setLoading(true);
    setError("");
    try {
      await confirmCryptoDemo(payment.id);
      const updated = await getCryptoPayment(payment.id, userId);
      setPayment(updated);
      setStep("success");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al confirmar");
    } finally {
      setLoading(false);
    }
  }

  async function copyAddress() {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.payAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const symbol =
    currencies.find((c) => c.id === payment?.payCurrency)?.symbol ?? "CRYPTO";

  return (
    <div className="deposit-overlay" onClick={onClose}>
      <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="deposit-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className="deposit-header">
          <span className="deposit-icon">₿</span>
          <h2>Depositar con Crypto</h2>
          <p>Envía cripto y tu saldo se acredita al confirmar la red</p>
        </div>

        {step === "form" && (
          <form className="deposit-form" onSubmit={handleCheckout}>
            <label>
              Monto (USD)
              <input
                type="number"
                min={10}
                max={5000}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </label>

            <div className="deposit-presets">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={amount === p ? "active" : ""}
                  onClick={() => setAmount(p)}
                >
                  ${p}
                </button>
              ))}
            </div>

            <label>
              Moneda
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CryptoCurrency)}
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                {currencies.length === 0 && (
                  <>
                    <option value="usdttrc20">USDT (TRC20)</option>
                    <option value="btc">Bitcoin</option>
                    <option value="eth">Ethereum</option>
                  </>
                )}
              </select>
            </label>

            {error && <p className="deposit-error">{error}</p>}

            <button type="submit" className="deposit-submit" disabled={loading}>
              {loading ? "Generando dirección..." : "Continuar con crypto"}
            </button>

            {isDemo && (
              <p className="deposit-note">
                Modo demo activo: simula un pago real sin enviar fondos.
              </p>
            )}
          </form>
        )}

        {step === "paying" && payment && (
          <div className="deposit-paying">
            <div className="deposit-qr">
              {!isDemo && payment.payAddress ? (
                <img
                  className="deposit-qr-image"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(payment.payAddress)}`}
                  alt={`QR ${symbol}`}
                />
              ) : (
                <div className="deposit-qr-placeholder">
                  <span>{symbol}</span>
                </div>
              )}
            </div>

            <div className="deposit-amount-row">
              <span>Envía exactamente</span>
              <strong>
                {payment.payAmount} {symbol}
              </strong>
            </div>

            <div className="deposit-address-box">
              <code>{payment.payAddress}</code>
              <button type="button" onClick={copyAddress}>
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            <div className="deposit-status">
              <span className={`status-dot status-${payment.status}`} />
              {payment.status === "waiting" && "Esperando pago..."}
              {payment.status === "confirming" && "Confirmando en la red..."}
              {payment.status === "finished" && "¡Pago acreditado!"}
            </div>

            <p className="deposit-equiv">≈ ${payment.amountUsd.toLocaleString()} USD</p>

            {isDemo && (
              <button
                type="button"
                className="deposit-demo-btn"
                onClick={handleDemoConfirm}
                disabled={loading || payment.credited}
              >
                {loading ? "Confirmando..." : "Simular pago recibido (demo)"}
              </button>
            )}

            {!isDemo && (
              <p className="deposit-note">
                Envía solo {symbol} a esta dirección. El saldo se actualiza al confirmar el pago en la red.
              </p>
            )}

            {error && <p className="deposit-error">{error}</p>}
          </div>
        )}

        {step === "success" && payment && (
          <div className="deposit-success">
            <div className="deposit-success-icon">✓</div>
            <h3>Depósito acreditado</h3>
            <p>
              Se agregaron <strong>${payment.amountUsd.toLocaleString()}</strong> a tu saldo.
            </p>
            <button type="button" className="deposit-submit" onClick={onClose}>
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
