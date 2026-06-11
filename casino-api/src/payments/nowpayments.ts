import crypto from "crypto";

const SANDBOX_BASE = "https://api-sandbox.nowpayments.io/v1";
const PRODUCTION_BASE = "https://api.nowpayments.io/v1";

export interface NowPaymentResponse {
  payment_id: number | string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  order_id?: string;
  expiration_estimate_date?: string;
}

function getBaseUrl(): string {
  return process.env.NOWPAYMENTS_SANDBOX === "true" ? SANDBOX_BASE : PRODUCTION_BASE;
}

function getApiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_NOT_CONFIGURED");
  return key;
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string }).message ??
    (body as { error?: string }).error ??
    `NOWPayments respondió con ${res.status}`;
  return message;
}

export async function createNowPayment(params: {
  priceAmount: number;
  payCurrency: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl?: string;
}): Promise<NowPaymentResponse> {
  const payload: Record<string, string | number> = {
    price_amount: params.priceAmount,
    price_currency: "usd",
    pay_currency: params.payCurrency,
    order_id: params.orderId,
    order_description: params.orderDescription,
  };
  if (params.ipnCallbackUrl) {
    payload.ipn_callback_url = params.ipnCallbackUrl;
  }

  const res = await fetch(`${getBaseUrl()}/payment`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<NowPaymentResponse>;
}

export async function getNowPaymentStatus(
  providerPaymentId: string
): Promise<NowPaymentResponse> {
  const res = await fetch(`${getBaseUrl()}/payment/${providerPaymentId}`, {
    headers: { "x-api-key": getApiKey() },
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<NowPaymentResponse>;
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortKeysDeep(record[key]);
      return acc;
    }, {});
}

export function verifyNowPaymentsSignature(
  body: Record<string, unknown>,
  signature: string | undefined
): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;

  const payload = JSON.stringify(sortKeysDeep(body));
  const expected = crypto.createHmac("sha512", secret).update(payload).digest("hex");

  try {
    const a = Buffer.from(expected.toLowerCase(), "utf8");
    const b = Buffer.from(signature.toLowerCase(), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mapNowPaymentStatus(status: string): "waiting" | "confirming" | "finished" | "failed" | "expired" {
  switch (status) {
    case "finished":
      return "finished";
    case "confirmed":
    case "confirming":
    case "sending":
    case "partially_paid":
      return "confirming";
    case "failed":
    case "refunded":
      return "failed";
    case "expired":
      return "expired";
    default:
      return "waiting";
  }
}

export function isNowPaymentsEnabled(): boolean {
  return (
    process.env.CRYPTO_PROVIDER === "nowpayments" &&
    Boolean(process.env.NOWPAYMENTS_API_KEY)
  );
}

export function getIpnCallbackUrl(): string | undefined {
  const base = process.env.PUBLIC_API_URL;
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/api/payments/crypto/webhook`;
}
