import { addTransaction, getUser, updateBalance } from "../store";
import {
  createNowPayment,
  getIpnCallbackUrl,
  getNowPaymentStatus,
  isNowPaymentsEnabled,
  mapNowPaymentStatus,
  verifyNowPaymentsSignature,
} from "./nowpayments";
import {
  createPayment,
  getPayment,
  markPaymentCredited,
  updatePaymentDetails,
  updatePaymentStatus,
} from "./paymentStore";
import { CRYPTO_OPTIONS, type CryptoCurrency, type CryptoPayment } from "./types";

const MIN_DEPOSIT_USD = 10;
const MAX_DEPOSIT_USD = 5000;
const PAYMENT_TTL_MS = 30 * 60 * 1000;

const demoTimers = new Map<string, ReturnType<typeof setTimeout>>();

function roundCrypto(amount: number, currency: CryptoCurrency): number {
  const decimals = currency === "btc" ? 8 : currency === "eth" ? 6 : 2;
  const factor = 10 ** decimals;
  return Math.ceil(amount * factor) / factor;
}

function demoAddress(currency: CryptoCurrency): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const len = currency === "btc" ? 34 : currency === "eth" ? 42 : 34;
  const prefix = currency === "btc" ? "bc1q" : currency === "eth" ? "0x" : "T";
  let addr = prefix;
  for (let i = prefix.length; i < len; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function usdToCrypto(amountUsd: number, currency: CryptoCurrency): number {
  const opt = CRYPTO_OPTIONS.find((c) => c.id === currency);
  if (!opt) return amountUsd;
  return roundCrypto(amountUsd / opt.demoRateUsd, currency);
}

export function getCryptoCurrencies() {
  return CRYPTO_OPTIONS.map(({ id, label, symbol }) => ({ id, label, symbol }));
}

async function createDemoCheckout(
  userId: string,
  amountUsd: number,
  payCurrency: CryptoCurrency
): Promise<CryptoPayment> {
  const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();
  const payment = createPayment({
    userId,
    amountUsd,
    payCurrency,
    payAmount: usdToCrypto(amountUsd, payCurrency),
    payAddress: demoAddress(payCurrency),
    status: "waiting",
    provider: "demo",
    expiresAt,
  });

  scheduleDemoConfirmation(payment.id);
  return payment;
}

async function createNowPaymentsCheckout(
  userId: string,
  amountUsd: number,
  payCurrency: CryptoCurrency
): Promise<CryptoPayment> {
  const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();
  const payment = createPayment({
    userId,
    amountUsd,
    payCurrency,
    payAmount: 0,
    payAddress: "",
    status: "waiting",
    provider: "nowpayments",
    expiresAt,
  });

  try {
    const np = await createNowPayment({
      priceAmount: amountUsd,
      payCurrency,
      orderId: payment.id,
      orderDescription: `Depósito casino — $${amountUsd} USD`,
      ipnCallbackUrl: getIpnCallbackUrl(),
    });

    const npExpires = np.expiration_estimate_date
      ? new Date(np.expiration_estimate_date).toISOString()
      : expiresAt;

    return (
      updatePaymentDetails(payment.id, {
        payAmount: np.pay_amount,
        payAddress: np.pay_address,
        providerPaymentId: String(np.payment_id),
        status: mapNowPaymentStatus(np.payment_status),
        expiresAt: npExpires,
      }) ?? payment
    );
  } catch (err) {
    updatePaymentStatus(payment.id, "failed");
    throw err;
  }
}

export async function createCryptoCheckout(
  userId: string,
  amountUsd: number,
  payCurrency: CryptoCurrency
): Promise<CryptoPayment> {
  const user = getUser(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  if (!CRYPTO_OPTIONS.some((c) => c.id === payCurrency)) {
    throw new Error("INVALID_CURRENCY");
  }
  if (amountUsd < MIN_DEPOSIT_USD || amountUsd > MAX_DEPOSIT_USD) {
    throw new Error("INVALID_AMOUNT");
  }

  if (isNowPaymentsEnabled()) {
    return createNowPaymentsCheckout(userId, amountUsd, payCurrency);
  }

  if (process.env.CRYPTO_PROVIDER === "nowpayments") {
    throw new Error("NOWPAYMENTS_NOT_CONFIGURED");
  }

  return createDemoCheckout(userId, amountUsd, payCurrency);
}

function scheduleDemoConfirmation(paymentId: string) {
  const existing = demoTimers.get(paymentId);
  if (existing) clearTimeout(existing);

  const delayMs = Number(process.env.CRYPTO_DEMO_CONFIRM_MS) || 12000;
  const timer = setTimeout(() => {
    demoTimers.delete(paymentId);
    void creditCryptoPayment(paymentId, "demo_auto");
  }, delayMs);
  demoTimers.set(paymentId, timer);
}

async function applyProviderStatus(
  paymentId: string,
  providerStatus: string
): Promise<void> {
  const mapped = mapNowPaymentStatus(providerStatus);
  updatePaymentStatus(paymentId, mapped);
}

export async function refreshCryptoPaymentStatus(
  paymentId: string
): Promise<CryptoPayment | null> {
  const payment = getPayment(paymentId);
  if (!payment || payment.credited || payment.provider !== "nowpayments") {
    return payment ?? null;
  }
  if (!payment.providerPaymentId) return payment;

  try {
    const np = await getNowPaymentStatus(payment.providerPaymentId);
    await applyProviderStatus(paymentId, np.payment_status);

    if (np.payment_status === "finished") {
      await creditCryptoPayment(paymentId, "poll");
    }
  } catch {
    /* polling is best-effort */
  }

  return getPayment(paymentId) ?? null;
}

export async function handleNowPaymentsIpn(
  body: Record<string, unknown>,
  signature: string | undefined
): Promise<{ received: boolean; credited: boolean }> {
  if (!verifyNowPaymentsSignature(body, signature)) {
    throw new Error("INVALID_SIGNATURE");
  }

  const orderId = body.order_id as string | undefined;
  const paymentStatus = body.payment_status as string | undefined;

  if (!orderId || !paymentStatus) {
    return { received: true, credited: false };
  }

  const payment = getPayment(orderId);
  if (!payment) {
    return { received: true, credited: false };
  }

  await applyProviderStatus(orderId, paymentStatus);

  if (paymentStatus === "finished") {
    const result = await creditCryptoPayment(orderId, "webhook");
    return { received: true, credited: result.ok };
  }

  return { received: true, credited: false };
}

export async function creditCryptoPayment(
  paymentId: string,
  _source = "webhook"
): Promise<{ ok: boolean; payment?: CryptoPayment; userBalance?: number; reason?: string }> {
  const payment = getPayment(paymentId);
  if (!payment) return { ok: false, reason: "NOT_FOUND" };
  if (payment.credited) {
    const user = getUser(payment.userId);
    return { ok: true, payment, userBalance: user?.balance };
  }
  if (payment.status === "expired" || payment.status === "failed") {
    return { ok: false, reason: "INVALID_STATUS" };
  }
  if (new Date(payment.expiresAt).getTime() < Date.now()) {
    updatePaymentStatus(paymentId, "expired");
    return { ok: false, reason: "EXPIRED" };
  }

  const user = getUser(payment.userId);
  if (!user) return { ok: false, reason: "USER_NOT_FOUND" };

  updatePaymentStatus(paymentId, "confirming");
  const updated = updateBalance(payment.userId, payment.amountUsd);
  if (!updated) return { ok: false, reason: "USER_NOT_FOUND" };

  addTransaction(payment.userId, "deposit", payment.amountUsd, updated.balance);
  const credited = markPaymentCredited(paymentId);

  const timer = demoTimers.get(paymentId);
  if (timer) {
    clearTimeout(timer);
    demoTimers.delete(paymentId);
  }

  return { ok: true, payment: credited ?? undefined, userBalance: updated.balance };
}

export async function getCryptoPaymentForUser(
  paymentId: string,
  userId: string
): Promise<CryptoPayment | null> {
  const payment = getPayment(paymentId);
  if (!payment || payment.userId !== userId) return null;

  if (payment.provider === "nowpayments" && !payment.credited) {
    return (await refreshCryptoPaymentStatus(paymentId)) ?? payment;
  }

  return payment;
}

export { MIN_DEPOSIT_USD, MAX_DEPOSIT_USD };
