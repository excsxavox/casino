import { Router } from "express";
import {
  createCryptoCheckout,
  creditCryptoPayment,
  getCryptoCurrencies,
  getCryptoPaymentForUser,
  handleNowPaymentsIpn,
  MAX_DEPOSIT_USD,
  MIN_DEPOSIT_USD,
} from "../payments/crypto";
import { isNowPaymentsEnabled } from "../payments/nowpayments";
import type { CryptoCurrency } from "../payments/types";

const router = Router();

router.get("/crypto/config", (_req, res) => {
  res.json({
    demo: !isNowPaymentsEnabled(),
    provider: isNowPaymentsEnabled() ? "nowpayments" : "demo",
    sandbox: process.env.NOWPAYMENTS_SANDBOX === "true",
  });
});

router.get("/crypto/currencies", (_req, res) => {
  res.json(getCryptoCurrencies());
});

router.post("/crypto/checkout", async (req, res) => {
  const { userId, amountUsd, currency } = req.body as {
    userId?: string;
    amountUsd?: number;
    currency?: CryptoCurrency;
  };

  if (!userId || !amountUsd || !currency) {
    res.status(400).json({ error: "userId, amountUsd y currency son requeridos" });
    return;
  }

  try {
    const payment = await createCryptoCheckout(userId, Number(amountUsd), currency);
    res.status(201).json({
      payment,
      demo: payment.provider === "demo",
      message:
        payment.provider === "demo"
          ? "Modo demo: el saldo se acredita automáticamente al confirmar el pago simulado."
          : "Envía el monto exacto a la dirección indicada. El saldo se acredita al confirmar el pago.",
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "USER_NOT_FOUND") {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    if (code === "INVALID_CURRENCY") {
      res.status(400).json({ error: "Moneda no soportada" });
      return;
    }
    if (code === "INVALID_AMOUNT") {
      res.status(400).json({
        error: `Monto inválido. Mínimo $${MIN_DEPOSIT_USD}, máximo $${MAX_DEPOSIT_USD}`,
      });
      return;
    }
    if (code === "NOWPAYMENTS_NOT_CONFIGURED") {
      res.status(501).json({
        error:
          "NOWPayments no está configurado. Define NOWPAYMENTS_API_KEY en .env o usa CRYPTO_PROVIDER=demo.",
      });
      return;
    }
    if (code.startsWith("NOWPayments") || code.includes("API")) {
      res.status(502).json({ error: `NOWPayments: ${code}` });
      return;
    }
    res.status(500).json({ error: code || "Error al crear el pago" });
  }
});

router.get("/crypto/:paymentId", async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: "userId es requerido" });
    return;
  }
  const payment = await getCryptoPaymentForUser(req.params.paymentId, userId);
  if (!payment) {
    res.status(404).json({ error: "Pago no encontrado" });
    return;
  }
  res.json(payment);
});

router.post("/crypto/webhook", async (req, res) => {
  const signature = req.headers["x-nowpayments-sig"] as string | undefined;

  try {
    const result = await handleNowPaymentsIpn(
      req.body as Record<string, unknown>,
      signature
    );
    res.json(result);
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "INVALID_SIGNATURE") {
      res.status(401).json({ error: "Firma IPN inválida" });
      return;
    }
    res.status(500).json({ error: "Error procesando webhook" });
  }
});

router.post("/crypto/demo/confirm/:paymentId", async (req, res) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_CRYPTO !== "true") {
    res.status(403).json({ error: "Confirmación demo no disponible en producción" });
    return;
  }

  const result = await creditCryptoPayment(req.params.paymentId, "demo_manual");
  if (!result.ok) {
    res.status(400).json({ error: result.reason ?? "No se pudo acreditar" });
    return;
  }
  res.json({ payment: result.payment, balance: result.userBalance });
});

export default router;
