interface PesapalToken {
  token: string;
  expiryDate: string;
}

export interface PesapalInitiateParams {
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

export interface PesapalInitiateResponse {
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

export async function getPesapalToken(baseUrl: string, consumerKey: string, consumerSecret: string): Promise<string> {
  if (cachedToken && new Date(cachedToken.expiryDate) > new Date()) {
    return cachedToken.token;
  }

  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`PesaPal token request failed: ${res.status} ${errorBody.slice(0, 300)}`);
  }

  const data = await res.json();
  if (data.error || !data.token) {
    throw new Error(`PesaPal token error: ${data.error?.message || 'unknown'}`);
  }

  cachedToken = { token: data.token, expiryDate: data.expiryDate };
  return data.token;
}

export async function initiatePayment(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  params: PesapalInitiateParams
): Promise<PesapalInitiateResponse> {
  const token = await getPesapalToken(baseUrl, consumerKey, consumerSecret);

  const res = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
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
    throw new Error(`PesaPal payment initiation failed: ${res.status} ${errorBody.slice(0, 300)}`);
  }

  const data: PesapalInitiateResponse = await res.json();
  if (data.error || !data.redirect_url) {
    throw new Error(`PesaPal initiation error: ${JSON.stringify(data.error || 'No redirect URL')}`);
  }

  return data;
}

export async function verifyTransaction(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  orderTrackingId: string
): Promise<PesapalTransaction> {
  const token = await getPesapalToken(baseUrl, consumerKey, consumerSecret);

  const res = await fetch(
    `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`PesaPal verification failed: ${res.status}`);
  }

  return res.json();
}
