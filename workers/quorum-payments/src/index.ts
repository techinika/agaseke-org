import { Env, generateCorrelationId, jsonResp, errorResp, getFirebaseAccessToken, firestoreGet, firestoreQuery, firestoreUpdate } from './helpers';
import { initiatePayment as pesapalInitiate, verifyTransaction as pesapalVerify } from './pesapal';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        },
      });
    }

    if (method === 'POST' && path === '/initiate') {
      return handleInitiate(request, env);
    }
    if (method === 'POST' && path === '/webhook') {
      return handleWebhook(request, env);
    }
    if (method === 'POST' && path === '/finalize') {
      return handleFinalize(request, env);
    }
    if ((method === 'GET' || method === 'POST') && path === '/reconcile') {
      return handleReconcile(request, env);
    }

    return errorResp('Not found', 404);
  },
};

function verifyApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === env.API_KEY;
}

async function handleInitiate(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('qi');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401);

    const body = await request.json();
    const { depositId, amount, returnUrl, reason, email, name, slug, orgName } = body as {
      depositId: string;
      amount: number;
      returnUrl: string;
      reason?: string;
      email?: string;
      name?: string;
      slug?: string;
      orgName?: string;
    };

    if (!depositId || !amount || !returnUrl) {
      return errorResp('Missing required fields: depositId, amount, returnUrl', 400);
    }

    const notificationId = `${urlFromEnv(env)}/webhook`;

    const result = await pesapalInitiate(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, {
      id: depositId,
      amount,
      currency: 'USD',
      description: reason || `Payment to ${orgName || 'Quorum'}`,
      callbackUrl: returnUrl,
      notificationId,
      billingAddress: {
        email_address: email || 'support@quorum.org',
        first_name: name?.split(' ')[0] || 'Supporter',
        last_name: name?.split(' ').slice(1).join(' ') || '',
      },
    });

    return jsonResp({ redirectUrl: result.redirect_url, orderTrackingId: result.order_tracking_id });
  } catch (err) {
    console.error(`[${cid}] initiate error`, err);
    return errorResp(err instanceof Error ? err.message : 'Payment initiation failed');
  }
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('wh');
  try {
    const body = await request.json();
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body as {
      OrderTrackingId: string;
      OrderMerchantReference: string;
      OrderNotificationType: string;
    };

    if (!OrderTrackingId || !OrderMerchantReference) {
      return errorResp('Missing OrderTrackingId or OrderMerchantReference', 400);
    }

    if (OrderNotificationType !== 'IPNCHANGE') {
      return jsonResp({ status: 'ignored', message: `Notification type ${OrderNotificationType} not processed` });
    }

    const tx = await pesapalVerify(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, OrderTrackingId);

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_ADMIN_CLIENT_EMAIL.split('@')[1]?.replace('.gserviceaccount.com', '') || '';

    if (tx.status_code === 1) {
      await processCompleted(OrderMerchantReference, accessToken, projectId);
      return jsonResp({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 });
    }

    if (tx.status_code === 2) {
      await processFailed(OrderMerchantReference, tx.description || 'Payment failed', accessToken, projectId);
      return jsonResp({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 });
    }

    return jsonResp({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 });
  } catch (err) {
    console.error(`[${cid}] webhook error`, err);
    return errorResp('Webhook processing failed');
  }
}

async function handleFinalize(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('pf');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401);

    const body = await request.json();
    const { depositId } = body as { depositId: string };

    if (!depositId) return errorResp('Missing depositId', 400);

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_ADMIN_CLIENT_EMAIL.split('@')[1]?.replace('.gserviceaccount.com', '') || '';

    const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
    if (!txs.length) return jsonResp({ status: 'not_found' });

    const tx = txs[0];
    if (tx.status === 'completed') return jsonResp({ status: 'completed' });
    if (tx.status === 'failed') return jsonResp({ status: 'failed', failureReason: tx.failureReason || 'Payment was declined.' });

    const pesapalTx = await pesapalVerify(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, depositId);

    if (pesapalTx.status_code === 1) {
      await processCompleted(depositId, accessToken, projectId);
      return jsonResp({ status: 'completed' });
    }

    if (pesapalTx.status_code === 2) {
      await processFailed(depositId, pesapalTx.description || 'Payment failed', accessToken, projectId);
      return jsonResp({ status: 'failed', failureReason: pesapalTx.description });
    }

    return jsonResp({ status: 'processing', message: 'Payment is still being processed.' });
  } catch (err) {
    console.error(`[${cid}] finalize error`, err);
    return jsonResp({ status: 'processing', message: 'Could not verify payment status yet.' });
  }
}

async function handleReconcile(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('rec');
  try {
    const authHeader = request.headers.get('Authorization');
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return errorResp('Unauthorized', 401);
    }

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_ADMIN_CLIENT_EMAIL.split('@')[1]?.replace('.gserviceaccount.com', '') || '';

    const pendingTxs = await firestoreQuery('transactions', 'status', 'pending', accessToken, projectId);
    const results = { checked: 0, completed: 0, failed: 0, skipped: 0, errors: 0 };

    for (const tx of pendingTxs) {
      const depositId = tx.depositId as string | undefined;
      if (!depositId) { results.skipped++; continue; }

      try {
        const pesapalTx = await pesapalVerify(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, depositId);
        results.checked++;

        if (pesapalTx.status_code === 1) {
          await processCompleted(depositId, accessToken, projectId);
          results.completed++;
        } else if (pesapalTx.status_code === 2) {
          await processFailed(depositId, pesapalTx.description || 'Payment failed', accessToken, projectId);
          results.failed++;
        } else {
          results.skipped++;
        }
      } catch {
        results.errors++;
      }
    }

    return jsonResp(results);
  } catch (err) {
    console.error(`[${cid}] reconcile error`, err);
    return errorResp('Reconciliation failed');
  }
}

async function processCompleted(depositId: string, accessToken: string, projectId: string): Promise<void> {
  const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
  for (const tx of txs) {
    if (tx.status === 'completed') continue;
    await firestoreUpdate('transactions', tx.id, { status: 'completed', processedAt: new Date().toISOString() }, accessToken, projectId);

    if (tx.type === 'donation') {
      const donations = await firestoreQuery('donations', 'depositId', depositId, accessToken, projectId);
      for (const donation of donations) {
        if (donation.status === 'active') continue;
        await firestoreUpdate('donations', donation.id, { status: 'active' }, accessToken, projectId);
      }
    }

    if (tx.type === 'membership') {
      const memberships = await firestoreQuery('memberships', 'depositId', depositId, accessToken, projectId);
      for (const membership of memberships) {
        if (membership.status === 'active') continue;
        await firestoreUpdate('memberships', membership.id, { status: 'active' }, accessToken, projectId);

        if (membership.orgId && membership.userId) {
          await firestoreUpdate(
            `organizations/${membership.orgId}/members`,
            membership.userId as string,
            { status: 'active' },
            accessToken,
            projectId
          );
        }
      }
    }
  }
}

async function processFailed(depositId: string, reason: string, accessToken: string, projectId: string): Promise<void> {
  const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
  for (const tx of txs) {
    if (tx.status === 'failed') continue;
    await firestoreUpdate('transactions', tx.id, { status: 'failed', processedAt: new Date().toISOString(), failureReason: reason }, accessToken, projectId);

    if (tx.type === 'donation') {
      const donations = await firestoreQuery('donations', 'depositId', depositId, accessToken, projectId);
      for (const donation of donations) {
        if (donation.status === 'failed' || donation.status === 'active') continue;
        await firestoreUpdate('donations', donation.id, { status: 'failed' }, accessToken, projectId);
      }
    }

    if (tx.type === 'membership') {
      const memberships = await firestoreQuery('memberships', 'depositId', depositId, accessToken, projectId);
      for (const membership of memberships) {
        if (membership.status === 'failed' || membership.status === 'active') continue;
        await firestoreUpdate('memberships', membership.id, { status: 'failed' }, accessToken, projectId);

        if (membership.orgId && membership.userId) {
          await firestoreUpdate(
            `organizations/${membership.orgId}/members`,
            membership.userId as string,
            { status: 'failed' },
            accessToken,
            projectId
          );
        }
      }
    }
  }
}

function urlFromEnv(env: Env): string {
  return env.PESAPAL_BASE_URL.includes('cybqa') ? 'https://quorum-payments.quorum.workers.dev' : 'https://quorum-payments.quorum.workers.dev';
}
