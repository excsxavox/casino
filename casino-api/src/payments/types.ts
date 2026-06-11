export type CryptoCurrency = "usdttrc20" | "btc" | "eth";

export type PaymentStatus =
  | "waiting"
  | "confirming"
  | "finished"
  | "failed"
  | "expired";

export interface CryptoPayment {
  id: string;
  userId: string;
  amountUsd: number;
  payCurrency: CryptoCurrency;
  payAmount: number;
  payAddress: string;
  status: PaymentStatus;
  provider: "demo" | "nowpayments";
  providerPaymentId?: string;
  credited: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export const CRYPTO_OPTIONS: {
  id: CryptoCurrency;
  label: string;
  symbol: string;
  demoRateUsd: number;
}[] = [
  { id: "usdttrc20", label: "USDT (TRC20)", symbol: "USDT", demoRateUsd: 1 },
  { id: "btc", label: "Bitcoin", symbol: "BTC", demoRateUsd: 97000 },
  { id: "eth", label: "Ethereum", symbol: "ETH", demoRateUsd: 3500 },
];
