const PESAPAL_BASE_URL = process.env.PESAPAL_URL?.replace(/\/+$/, '');
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

interface AuthResponse {
  token: string;
}

interface IpnResponse {
  ipn_id: string;
}

interface OrderResponse {
  redirect_url: string;
  order_tracking_id: string;
  merchant_reference: string;
}

interface TransactionStatusResponse {
  payment_status_description: string;
  payment_method?: string;
  amount?: number;
  currency?: string;
  merchant_reference?: string;
  order_tracking_id?: string;
  payment_status_code?: string;
}

function getConfig() {
  if (!PESAPAL_BASE_URL || !PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    throw new Error(
      'PesaPal is not configured. Set PESAPAL_URL, PESAPAL_CONSUMER_KEY, and PESAPAL_CONSUMER_SECRET in your environment.'
    );
  }
  return { baseUrl: PESAPAL_BASE_URL, key: PESAPAL_CONSUMER_KEY, secret: PESAPAL_CONSUMER_SECRET };
}

export async function getAuthToken(): Promise<string> {
  const { baseUrl, key, secret } = getConfig();

  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });

  if (!res.ok) {
    throw new Error(`PesaPal auth failed: ${res.status} ${await res.text()}`);
  }

  const data: AuthResponse = await res.json();
  if (!data.token) {
    throw new Error('PesaPal auth returned no token');
  }

  return data.token;
}

export async function registerIpnUrl(url: string): Promise<string> {
  const { baseUrl } = getConfig();
  const token = await getAuthToken();

  const res = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ url, ipn_notification_type: 'POST' }),
  });

  if (!res.ok) {
    throw new Error(`PesaPal IPN registration failed: ${res.status} ${await res.text()}`);
  }

  const data: IpnResponse = await res.json();
  if (!data.ipn_id) {
    throw new Error('PesaPal IPN registration returned no ipn_id');
  }

  return data.ipn_id;
}

export async function submitOrderRequest(params: {
  id: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  notificationId: string;
  billingAddress: {
    emailAddress: string;
    firstName: string;
    lastName: string;
    countryCode: string;
  };
}): Promise<OrderResponse> {
  const { baseUrl } = getConfig();
  const token = await getAuthToken();

  const body = {
    id: params.id,
    currency: params.currency,
    amount: params.amount,
    description: params.description,
    callback_url: params.callbackUrl,
    notification_id: params.notificationId,
    billing_address: {
      email_address: params.billingAddress.emailAddress,
      first_name: params.billingAddress.firstName,
      last_name: params.billingAddress.lastName,
      country_code: params.billingAddress.countryCode,
    },
  };

  const res = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`PesaPal order submission failed: ${res.status} ${await res.text()}`);
  }

  const data: OrderResponse = await res.json();
  if (!data.redirect_url || !data.order_tracking_id) {
    throw new Error('PesaPal order submission returned incomplete data');
  }

  return data;
}

export async function getTransactionStatus(
  orderTrackingId: string
): Promise<TransactionStatusResponse> {
  const { baseUrl } = getConfig();
  const token = await getAuthToken();

  const res = await fetch(
    `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    }
  );

  if (!res.ok) {
    throw new Error(`PesaPal status check failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export function getPesaPalConfig() {
  return {
    baseUrl: PESAPAL_BASE_URL,
    hasCredentials: !!PESAPAL_CONSUMER_KEY && !!PESAPAL_CONSUMER_SECRET,
  };
}
