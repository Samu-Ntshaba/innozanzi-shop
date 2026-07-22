export type PaymentInitialization = { paymentId: string; amount: string; currency: string; email: string; callbackUrl: string; idempotencyKey: string };
export type PaymentSession = { externalReference: string; redirectUrl?: string; instructions?: string };
export type PaymentEvent = { eventId: string; externalReference: string; status: "PAID" | "FAILED" | "CANCELLED"; amount?: string; raw: unknown };
export interface PaymentProviderAdapter { initialize(input: PaymentInitialization): Promise<PaymentSession>; verifyWebhook(body: string, signature: string | null): PaymentEvent; }
