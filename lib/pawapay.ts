const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL;
const PAWAPAY_API_TOKEN = process.env.PAWAPAY_API_TOKEN;

export const PAWAPAY_PAYMENT_COUNTRY = 'RWA';
export const PAWAPAY_CURRENCY = 'RWF';
export const USD_TO_RWF_RATE = 1300;

interface PaymentPageResponse {
  redirectUrl: string;
}

interface DepositStatusResponse {
  depositId: string;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'IN_RECONCILIATION';
  amount?: string;
  currency?: string;
  failureReason?: {
    failureCode: string;
    failureMessage: string;
  };
}

interface CheckStatusApiResponse {
  status: 'FOUND';
  data: DepositStatusResponse;
}

// --- Client-safe helpers (no process.env references) ---

export function generateDepositId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function convertToRwf(usdAmount: number): number {
  return Math.round(usdAmount * USD_TO_RWF_RATE);
}

export function convertToUsd(rwfAmount: number): number {
  return Math.round((rwfAmount / USD_TO_RWF_RATE) * 100) / 100;
}

export function getReturnUrl(slug: string, depositId: string, type: 'donation' | 'membership'): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${baseUrl}/org/${slug}/payment/return/${depositId}/${type}`;
}

// --- Server-only functions ---

export async function initiatePaymentPage(
  depositId: string,
  params: {
    amount: string;
    returnUrl: string;
    reason?: string;
  }
): Promise<PaymentPageResponse> {
  if (!PAWAPAY_BASE_URL || !PAWAPAY_API_TOKEN) {
    throw new Error('pawaPay is not configured. Set PAWAPAY_BASE_URL and PAWAPAY_API_TOKEN in your environment.');
  }

  const body: Record<string, unknown> = {
    depositId,
    returnUrl: params.returnUrl,
    amount: params.amount,
    country: PAWAPAY_PAYMENT_COUNTRY,
  };

  if (params.reason) body.reason = params.reason;

  const response = await fetch(`${PAWAPAY_BASE_URL}/v2/paymentpage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAWAPAY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`pawaPay payment page initiation failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return { redirectUrl: data.redirectUrl };
}

export async function checkDepositStatus(
  depositId: string
): Promise<{ status: 'FOUND' | 'NOT_FOUND'; data?: DepositStatusResponse }> {
  if (!PAWAPAY_BASE_URL || !PAWAPAY_API_TOKEN) {
    throw new Error('pawaPay is not configured. Set PAWAPAY_BASE_URL and PAWAPAY_API_TOKEN in your environment.');
  }

  const response = await fetch(`${PAWAPAY_BASE_URL}/v2/deposits/${depositId}`, {
    headers: {
      'Authorization': `Bearer ${PAWAPAY_API_TOKEN}`,
    },
  });

  if (response.status === 404) {
    return { status: 'NOT_FOUND' };
  }

  if (!response.ok) {
    throw new Error(`pawaPay status check failed: ${response.status}`);
  }

  const data: CheckStatusApiResponse = await response.json();
  return { status: 'FOUND', data: data.data };
}

export function getPawaPayConfig() {
  return {
    baseUrl: PAWAPAY_BASE_URL,
    hasToken: !!PAWAPAY_API_TOKEN,
    country: PAWAPAY_PAYMENT_COUNTRY,
    currency: PAWAPAY_CURRENCY,
    rate: USD_TO_RWF_RATE,
  };
}
