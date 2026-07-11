import crypto from 'crypto';
import { getAppUrl } from '@/lib/app-url';
import { logger } from '@/lib/logger';

const PESAPAL_BASE_URL = process.env.PESAPAL_BASE_URL || 'https://cybqa.pesapal.com/pesapalv3';
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

interface PesapalToken {
  token: string;
  expiryDate: string;
}

interface PesapalInitiateParams {
  id: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  cancellationUrl?: string;
  notificationId: string;
  billingAddress: {
    email_address?: string;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    country_code?: string;
  };
}

interface PesapalInitiateResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error: unknown;
  status: string;
}

export interface PesapalTransaction {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number;
  merchant_reference: string;
  currency: string;
  error: unknown;
  status: string;
}

let cachedToken: PesapalToken | null = null;

function requireConfig(): { key: string; secret: string } {
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    throw new Error('PesaPal is not configured. Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.');
  }
  return { key: PESAPAL_CONSUMER_KEY, secret: PESAPAL_CONSUMER_SECRET };
}

export async function getPesapalToken(): Promise<string> {
  if (cachedToken && new Date(cachedToken.expiryDate) > new Date()) {
    return cachedToken.token;
  }

  const { key, secret } = requireConfig();
  logger.info('pesapal', 'Requesting new access token');

  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    logger.error('pesapal', `Token request failed: HTTP ${res.status}`, errorBody.slice(0, 500));
    throw new Error(`PesaPal token request failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.error || !data.token) {
    logger.error('pesapal', 'Token request error', data);
    throw new Error(`PesaPal token error: ${data.error?.message || 'unknown'}`);
  }

  cachedToken = { token: data.token, expiryDate: data.expiryDate };
  logger.info('pesapal', `Token acquired, expires ${data.expiryDate}`);
  return data.token;
}

export async function initiatePayment(params: PesapalInitiateParams): Promise<PesapalInitiateResponse> {
  const token = await getPesapalToken();
  logger.info('pesapal', `initiatePayment: id=${params.id}, amount=${params.amount} ${params.currency}`);

  const res = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: params.id,
      currency: params.currency,
      amount: params.amount,
      description: params.description,
      callback_url: params.callbackUrl,
      cancellation_url: params.cancellationUrl || '',
      notification_id: params.notificationId,
      redirect_mode: 'TOP_WINDOW',
      billing_address: params.billingAddress,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    logger.error('pesapal', `initiatePayment: HTTP ${res.status} for id=${params.id}`, errorBody.slice(0, 500));
    throw new Error(`PesaPal payment initiation failed: ${res.status}`);
  }

  const data: PesapalInitiateResponse = await res.json();
  if (data.error || !data.redirect_url) {
    logger.error('pesapal', `initiatePayment: API error for id=${params.id}`, data);
    throw new Error(`PesaPal initiation error: ${JSON.stringify(data.error || 'No redirect URL')}`);
  }

  logger.info('pesapal', `initiatePayment: success id=${params.id}, tracking=${data.order_tracking_id}`);
  return data;
}

export async function verifyTransaction(orderTrackingId: string): Promise<PesapalTransaction> {
  const token = await getPesapalToken();
  logger.info('pesapal', `verifyTransaction: orderTrackingId=${orderTrackingId}`);

  const res = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    logger.error('pesapal', `verifyTransaction: HTTP ${res.status} for trackingId=${orderTrackingId}`);
    throw new Error(`PesaPal verification failed: ${res.status}`);
  }

  const data: PesapalTransaction = await res.json();
  logger.info('pesapal', `verifyTransaction: trackingId=${orderTrackingId}, status=${data.payment_status_description}, code=${data.status_code}`);
  return data;
}

export function generateOrderId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getReturnUrl(slug: string, depositId: string, type: 'donation' | 'membership'): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : getAppUrl();
  return `${baseUrl}/org/${slug}/payment/return/${depositId}/${type}`;
}

export type PesapalPaymentStatus = 'COMPLETED' | 'FAILED' | 'PENDING' | 'INVALID' | 'REVERSED';

export function mapPesapalStatus(statusCode: number, statusDescription: string): 'completed' | 'failed' | 'pending' {
  if (statusCode === 1 || statusDescription.toUpperCase() === 'COMPLETED') return 'completed';
  if (statusCode === 2 || statusDescription.toUpperCase() === 'FAILED') return 'failed';
  return 'pending';
}
