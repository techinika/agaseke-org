import crypto from 'crypto';

const FLW_BASE_URL = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com';
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export type FlutterwavePaymentOption = 'card' | 'mobilemoneyrwanda' | 'card,mobilemoneyrwanda';

interface InitiateParams {
  tx_ref: string;
  amount: number;
  currency?: string;
  redirect_url: string;
  customer: { email: string; name?: string };
  meta?: Record<string, string>;
  payment_options?: FlutterwavePaymentOption;
  title?: string;
  description?: string;
  logo?: string;
}

interface FlwInitiateResponse {
  status: string;
  message: string;
  data: {
    link: string;
    id: number;
  };
}

interface FlwTransaction {
  id: number;
  tx_ref: string;
  amount: number;
  currency: string;
  status: 'successful' | 'failed' | 'pending';
  failure_reason?: string;
}

interface FlwVerifyResponse {
  status: string;
  message: string;
  data: FlwTransaction;
}

function requireConfig(): string {
  if (!FLW_SECRET_KEY) {
    throw new Error('Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY in your environment.');
  }
  return FLW_SECRET_KEY;
}

export async function initiatePayment(params: InitiateParams): Promise<{ link: string; id: number }> {
  const secretKey = requireConfig();

  const body: Record<string, unknown> = {
    tx_ref: params.tx_ref,
    amount: params.amount,
    currency: params.currency || 'USD',
    redirect_url: params.redirect_url,
    customer: params.customer,
    meta: params.meta || {},
  };

  if (params.payment_options) body.payment_options = params.payment_options;

  const customizations: Record<string, string> = {};
  if (params.title) customizations.title = params.title;
  if (params.description) customizations.description = params.description;
  if (params.logo) customizations.logo = params.logo;
  if (Object.keys(customizations).length > 0) body.customizations = customizations;

  const res = await fetch(`${FLW_BASE_URL}/v3/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Flutterwave payment initiation failed: ${res.status} ${errorBody}`);
  }

  const data: FlwInitiateResponse = await res.json();
  if (data.status !== 'success' || !data.data?.link) {
    throw new Error(`Flutterwave initiation error: ${data.message}`);
  }

  return { link: data.data.link, id: data.data.id };
}

export async function verifyTransaction(tx_ref: string): Promise<FlwTransaction> {
  const secretKey = requireConfig();

  const res = await fetch(`${FLW_BASE_URL}/v3/transactions/by_reference?tx_ref=${encodeURIComponent(tx_ref)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    throw new Error(`Flutterwave verification failed: ${res.status}`);
  }

  const data: FlwVerifyResponse = await res.json();
  if (data.status !== 'success') {
    throw new Error(`Flutterwave verification error: ${data.message}`);
  }

  return data.data;
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret) return true;
  try {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== signatureBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

export function generateDepositId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getFlutterwavePaymentOptions(paymentMethod: 'mobile_money' | 'card'): FlutterwavePaymentOption {
  if (paymentMethod === 'card') return 'card';
  return 'mobilemoneyrwanda';
}

export function getReturnUrl(slug: string, depositId: string, type: 'donation' | 'membership'): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${baseUrl}/org/${slug}/payment/return/${depositId}/${type}`;
}
