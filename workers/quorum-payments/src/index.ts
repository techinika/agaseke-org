import { Env, generateCorrelationId, jsonResp, errorResp, getFirebaseAccessToken, firestoreGet, firestoreQuery, firestoreUpdate, firestoreIncrementField } from './helpers';
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
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
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

    return errorResp('Not found', 404, env);
  },
};

function verifyApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === env.API_KEY;
}

async function handleInitiate(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('qi');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

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
      return errorResp('Missing required fields: depositId, amount, returnUrl', 400, env);
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

    return jsonResp({ redirectUrl: result.redirect_url, orderTrackingId: result.order_tracking_id }, 200, env);
  } catch (err) {
    console.error(`[${cid}] initiate error`, err);
    return errorResp(err instanceof Error ? err.message : 'Payment initiation failed', 500, env);
  }
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('wh');
  try {
    if (env.WEBHOOK_SECRET) {
      const headerSecret = request.headers.get('X-Webhook-Secret');
      if (!headerSecret || !timingSafeEqual(headerSecret, env.WEBHOOK_SECRET)) {
        console.warn(`[${cid}] webhook auth failed: invalid or missing X-Webhook-Secret`);
        return errorResp('Unauthorized', 401, env);
      }
    } else {
      console.warn(`[${cid}] WEBHOOK_SECRET not set — webhook is unauthenticated (migration period)`);
    }

    const body = await request.json();
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body as {
      OrderTrackingId: string;
      OrderMerchantReference: string;
      OrderNotificationType: string;
    };

    if (!OrderTrackingId || !OrderMerchantReference) {
      return errorResp('Missing OrderTrackingId or OrderMerchantReference', 400, env);
    }

    if (OrderNotificationType !== 'IPNCHANGE') {
      return jsonResp({ status: 'ignored', message: `Notification type ${OrderNotificationType} not processed` }, 200, env);
    }

    const tx = await pesapalVerify(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, OrderTrackingId);

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_ADMIN_CLIENT_EMAIL.split('@')[1]?.replace('.gserviceaccount.com', '') || '';

    if (tx.status_code === 1) {
      await processCompleted(OrderMerchantReference, accessToken, projectId, cid);
      return jsonResp({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 }, 200, env);
    }

    if (tx.status_code === 2) {
      await processFailed(OrderMerchantReference, tx.description || 'Payment failed', accessToken, projectId, cid);
      return jsonResp({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 }, 200, env);
    }

    return jsonResp({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 }, 200, env);
  } catch (err) {
    console.error(`[${cid}] webhook error`, err);
    return errorResp('Webhook processing failed', 500, env);
  }
}

async function handleFinalize(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('pf');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { depositId } = body as { depositId: string };

    if (!depositId) return errorResp('Missing depositId', 400, env);

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_ADMIN_CLIENT_EMAIL.split('@')[1]?.replace('.gserviceaccount.com', '') || '';

    const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
    if (!txs.length) return jsonResp({ status: 'not_found' }, 200, env);

    const tx = txs[0];
    if (tx.status === 'completed') return jsonResp({ status: 'completed' }, 200, env);
    if (tx.status === 'failed') return jsonResp({ status: 'failed', failureReason: tx.failureReason || 'Payment was declined.' }, 200, env);

    const pesapalTx = await pesapalVerify(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, depositId);

    if (pesapalTx.status_code === 1) {
      await processCompleted(depositId, accessToken, projectId, cid);
      return jsonResp({ status: 'completed' }, 200, env);
    }

    if (pesapalTx.status_code === 2) {
      await processFailed(depositId, pesapalTx.description || 'Payment failed', accessToken, projectId, cid);
      return jsonResp({ status: 'failed', failureReason: pesapalTx.description }, 200, env);
    }

    return jsonResp({ status: 'processing', message: 'Payment is still being processed.' }, 200, env);
  } catch (err) {
    console.error(`[${cid}] finalize error`, err);
    return jsonResp({ status: 'processing', message: 'Could not verify payment status yet.' }, 200, env);
  }
}

async function handleReconcile(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('rec');
  try {
    const authHeader = request.headers.get('Authorization');
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return errorResp('Unauthorized', 401, env);
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
          await processCompleted(depositId, accessToken, projectId, cid);
          results.completed++;
        } else if (pesapalTx.status_code === 2) {
          await processFailed(depositId, pesapalTx.description || 'Payment failed', accessToken, projectId, cid);
          results.failed++;
        } else {
          results.skipped++;
        }
      } catch {
        results.errors++;
      }
    }

    return jsonResp(results, 200, env);
  } catch (err) {
    console.error(`[${cid}] reconcile error`, err);
    return errorResp('Reconciliation failed', 500, env);
  }
}

async function processCompleted(depositId: string, accessToken: string, projectId: string, cid: string): Promise<void> {
  const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
  for (const tx of txs) {
    if (tx.status === 'completed') {
      console.log(`[${cid}] skipping already-completed transaction ${tx.id} for depositId=${depositId}`);
      continue;
    }
    await firestoreUpdate('transactions', tx.id, { status: 'completed', processedAt: new Date().toISOString() }, accessToken, projectId);

    if (tx.type === 'donation') {
      const donations = await firestoreQuery('donations', 'depositId', depositId, accessToken, projectId);
      for (const donation of donations) {
        if (donation.status === 'active') {
          console.log(`[${cid}] skipping already-active donation ${donation.id}`);
          continue;
        }
        await firestoreUpdate('donations', donation.id, { status: 'active' }, accessToken, projectId);

        const campaignId = donation.campaignId as string | undefined;
        const orgId = donation.orgId as string | undefined;
        const amount = donation.amount as number | undefined;
        if (campaignId && orgId && amount && amount > 0) {
          console.log(`[${cid}] incrementing campaign ${campaignId} raisedAmount by ${amount}`);
          await firestoreIncrementField(`organizations/${orgId}/campaigns`, campaignId, 'raisedAmount', amount, accessToken, projectId);
        }
      }
    }

    if (tx.type === 'membership') {
      const memberships = await firestoreQuery('memberships', 'depositId', depositId, accessToken, projectId);
      for (const membership of memberships) {
        if (membership.status === 'active') {
          console.log(`[${cid}] skipping already-active membership ${membership.id}`);
          continue;
        }
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

    if (tx.type === 'subscription') {
      const targetPlan = tx.targetPlan as string | undefined;
      const targetBillingCycle = tx.targetBillingCycle as string | undefined;
      if (targetPlan && tx.orgId) {
        const updateData: Record<string, unknown> = {
          subscriptionPlan: targetPlan,
        };
        if (targetBillingCycle) {
          updateData.subscriptionBillingCycle = targetBillingCycle;
        }
        await firestoreUpdate('organizations', tx.orgId as string, updateData, accessToken, projectId);
      }
    }
  }
}

async function processFailed(depositId: string, reason: string, accessToken: string, projectId: string, cid: string): Promise<void> {
  const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
  for (const tx of txs) {
    if (tx.status === 'failed') {
      console.log(`[${cid}] skipping already-failed transaction ${tx.id} for depositId=${depositId}`);
      continue;
    }
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
  if (env.WORKER_URL) return env.WORKER_URL;
  return env.PESAPAL_BASE_URL.includes('cybqa')
    ? 'https://quorum-payments.quorum.workers.dev'
    : 'https://quorum-payments.quorum.workers.dev';
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}
