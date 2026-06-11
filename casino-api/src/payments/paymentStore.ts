import { v4 as uuid } from "uuid";
import type { CryptoPayment, PaymentStatus } from "./types";

const payments = new Map<string, CryptoPayment>();

export function createPayment(
  data: Omit<CryptoPayment, "id" | "createdAt" | "updatedAt" | "credited">
): CryptoPayment {
  const now = new Date().toISOString();
  const payment: CryptoPayment = {
    ...data,
    id: uuid(),
    credited: false,
    createdAt: now,
    updatedAt: now,
  };
  payments.set(payment.id, payment);
  return payment;
}

export function getPayment(id: string): CryptoPayment | undefined {
  return payments.get(id);
}

export function getPaymentsByUser(userId: string): CryptoPayment[] {
  return Array.from(payments.values())
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  extra?: Partial<Pick<CryptoPayment, "providerPaymentId">>
): CryptoPayment | null {
  const payment = payments.get(id);
  if (!payment) return null;
  payment.status = status;
  payment.updatedAt = new Date().toISOString();
  if (extra?.providerPaymentId) {
    payment.providerPaymentId = extra.providerPaymentId;
  }
  payments.set(id, payment);
  return payment;
}

export function updatePaymentDetails(
  id: string,
  details: Partial<
    Pick<
      CryptoPayment,
      "payAmount" | "payAddress" | "providerPaymentId" | "status" | "expiresAt"
    >
  >
): CryptoPayment | null {
  const payment = payments.get(id);
  if (!payment) return null;
  Object.assign(payment, details);
  payment.updatedAt = new Date().toISOString();
  payments.set(id, payment);
  return payment;
}

export function getPaymentByProviderId(
  providerPaymentId: string
): CryptoPayment | undefined {
  return Array.from(payments.values()).find(
    (p) => p.providerPaymentId === providerPaymentId
  );
}

export function markPaymentCredited(id: string): CryptoPayment | null {
  const payment = payments.get(id);
  if (!payment) return null;
  payment.credited = true;
  payment.status = "finished";
  payment.updatedAt = new Date().toISOString();
  payments.set(id, payment);
  return payment;
}

export function getAllPayments(): CryptoPayment[] {
  return Array.from(payments.values());
}
