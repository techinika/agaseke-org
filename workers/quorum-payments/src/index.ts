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

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_ADMIN_CLIENT_EMAIL.split('@')[1]?.replace('.gserviceaccount.com', '') || '';
    await firestoreUpdate('transactions', depositId, { orderTrackingId: result.order_tracking_id }, accessToken, projectId);
    console.log(`[${cid}] stored orderTrackingId=${result.order_tracking_id} for depositId=${depositId}`);

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
      await processCompleted(OrderMerchantReference, env, accessToken, projectId, cid);
      return jsonResp({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 }, 200, env);
    }

    if (tx.status_code === 2) {
      await processFailed(OrderMerchantReference, tx.description || 'Payment failed', env, accessToken, projectId, cid);
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

    const trackingId = tx.orderTrackingId as string | undefined;
    if (!trackingId) return jsonResp({ status: 'processing', message: 'Payment is still being processed.' }, 200, env);

    const pesapalTx = await pesapalVerify(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, trackingId);

    if (pesapalTx.status_code === 1) {
      await processCompleted(depositId, env, accessToken, projectId, cid);
      return jsonResp({ status: 'completed' }, 200, env);
    }

    if (pesapalTx.status_code === 2) {
      await processFailed(depositId, pesapalTx.description || 'Payment failed', env, accessToken, projectId, cid);
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
      const trackingId = tx.orderTrackingId as string | undefined;
      if (!depositId || !trackingId) { results.skipped++; continue; }

      try {
        const pesapalTx = await pesapalVerify(env.PESAPAL_BASE_URL, env.PESAPAL_CONSUMER_KEY, env.PESAPAL_CONSUMER_SECRET, trackingId);
        results.checked++;

        if (pesapalTx.status_code === 1) {
          await processCompleted(depositId, env, accessToken, projectId, cid);
          results.completed++;
        } else if (pesapalTx.status_code === 2) {
          await processFailed(depositId, pesapalTx.description || 'Payment failed', env, accessToken, projectId, cid);
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

async function processCompleted(depositId: string, env: Env, accessToken: string, projectId: string, cid: string): Promise<void> {
  const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
  for (const tx of txs) {
    if (tx.status === 'completed' || tx.processedAt) {
      console.log(`[${cid}] skipping already-processed transaction ${tx.id} for depositId=${depositId}`);
      continue;
    }
    if (tx.status === 'failed') {
      console.log(`[${cid}] skipping failed transaction ${tx.id} for depositId=${depositId}`);
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
        const orgReceives = (donation.orgReceives as number) || 0;
        if (campaignId && orgId && orgReceives > 0) {
          console.log(`[${cid}] incrementing campaign ${campaignId} raisedAmount by ${orgReceives}`);
          await firestoreIncrementField(`organizations/${orgId}/campaigns`, campaignId, 'raisedAmount', orgReceives, accessToken, projectId);
        }

        await sendEmailSafe(env, {
          to: donation.donorEmail as string,
          orgId: orgId as string,
          type: 'donation',
          amount: donation.amount as number,
          name: donation.donorName as string | undefined,
          description: donation.campaignName as string | undefined,
          transactionId: donation.id as string,
          cid,
        });
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

        const user = await firestoreGet('users', membership.userId as string, accessToken, projectId);
        await sendEmailSafe(env, {
          to: user?.email as string,
          orgId: membership.orgId as string,
          type: 'membership',
          amount: (membership.amount as number) || 0,
          name: user?.displayName as string | undefined,
          description: membership.tierName as string | undefined,
          transactionId: membership.id as string,
          cid,
        });
      }
    }

    if (tx.type === 'subscription') {
      await notifySubscriptionsFinalize(env, tx, cid);
    }
  }
}

async function processFailed(depositId: string, reason: string, env: Env, accessToken: string, projectId: string, cid: string): Promise<void> {
  const txs = await firestoreQuery('transactions', 'depositId', depositId, accessToken, projectId);
  for (const tx of txs) {
    if (tx.status === 'failed' || tx.processedAt) {
      console.log(`[${cid}] skipping already-processed transaction ${tx.id} for depositId=${depositId}`);
      continue;
    }
    if (tx.status === 'completed') {
      console.log(`[${cid}] skipping completed transaction ${tx.id} for depositId=${depositId}`);
      continue;
    }
    await firestoreUpdate('transactions', tx.id, { status: 'failed', processedAt: new Date().toISOString(), failureReason: reason }, accessToken, projectId);

    if (tx.type === 'donation') {
      const donations = await firestoreQuery('donations', 'depositId', depositId, accessToken, projectId);
      for (const donation of donations) {
        if (donation.status === 'failed' || donation.status === 'active') continue;
        await firestoreUpdate('donations', donation.id, { status: 'failed' }, accessToken, projectId);

        const user = await firestoreGet('users', donation.userId as string, accessToken, projectId);
        await sendFailedEmailSafe(env, {
          to: user?.email as string || donation.donorEmail as string,
          orgId: donation.orgId as string,
          type: 'donation',
          amount: donation.amount as number,
          name: user?.displayName as string || donation.donorName as string,
          reason,
          cid,
        });
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

        const user = await firestoreGet('users', membership.userId as string, accessToken, projectId);
        await sendFailedEmailSafe(env, {
          to: user?.email as string,
          orgId: membership.orgId as string,
          type: 'membership',
          amount: (membership.amount as number) || 0,
          name: user?.displayName as string,
          reason,
          cid,
        });
      }
    }

    if (tx.type === 'subscription') {
      await notifySubscriptionsFailure(env, tx, reason, cid);
    }
  }
}

function urlFromEnv(env: Env): string {
  if (env.WORKER_URL) return env.WORKER_URL;
  if (!env.ALLOWED_ORIGIN) {
    console.warn('WARNING: WORKER_URL and ALLOWED_ORIGIN not set. Webhook URLs will be wrong.');
  }
  return env.ALLOWED_ORIGIN || 'https://quorum-payments.quorum.workers.dev';
}

async function sendEmailSafe(env: Env, params: { to?: string; orgId: string; type: string; amount: number; name?: string; description?: string; transactionId: string; cid: string }): Promise<void> {
  if (!params.to || !env.QUORUM_COMM_URL || !env.QUORUM_COMM_API_KEY) return;
  try {
    const res = await fetch(`${env.QUORUM_COMM_URL}/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.QUORUM_COMM_API_KEY },
      body: JSON.stringify({
        to: params.to,
        orgId: params.orgId,
        type: params.type,
        amount: params.amount,
        currency: 'USD',
        transactionId: params.transactionId,
        toName: params.name,
        description: params.description,
      }),
    });
    if (!res.ok) console.error(`[${params.cid}] send-confirmation failed: ${res.status}`);
    else console.log(`[${params.cid}] confirmation email sent to ${params.to}`);
  } catch (err) {
    console.error(`[${params.cid}] email send error`, err);
  }
}

async function sendFailedEmailSafe(env: Env, params: { to?: string; orgId: string; type: string; amount: number; name?: string; reason: string; cid: string }): Promise<void> {
  if (!params.to || !env.QUORUM_COMM_URL || !env.QUORUM_COMM_API_KEY) return;
  try {
    const res = await fetch(`${env.QUORUM_COMM_URL}/send-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.QUORUM_COMM_API_KEY },
      body: JSON.stringify({
        to: params.to,
        orgId: params.orgId,
        type: params.type,
        amount: params.amount,
        currency: 'USD',
        failureReason: params.reason,
        toName: params.name,
      }),
    });
    if (!res.ok) console.error(`[${params.cid}] send-failure failed: ${res.status}`);
    else console.log(`[${params.cid}] failure email sent to ${params.to}`);
  } catch (err) {
    console.error(`[${params.cid}] email send error`, err);
  }
}

async function notifySubscriptionsFinalize(env: Env, tx: Record<string, unknown>, cid: string): Promise<void> {
  if (!env.QUORUM_SUBSCRIPTIONS_URL || !env.QUORUM_SUBSCRIPTIONS_API_KEY) {
    console.warn(`[${cid}] QUORUM_SUBSCRIPTIONS_URL not configured, skipping subscription finalization`);
    return;
  }

  try {
    const res = await fetch(`${env.QUORUM_SUBSCRIPTIONS_URL}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.QUORUM_SUBSCRIPTIONS_API_KEY,
      },
      body: JSON.stringify({
        orgId: tx.orgId,
        orderId: tx.depositId || tx.referenceId,
        targetPlan: tx.targetPlan,
        subscriptionMonths: tx.subscriptionMonths || 1,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[${cid}] quorum-subscriptions/finalize failed: ${res.status} ${errBody.slice(0, 200)}`);
    } else {
      console.log(`[${cid}] Subscription finalized via quorum-subscriptions for org ${tx.orgId}`);
    }
  } catch (err) {
    console.error(`[${cid}] Failed to call quorum-subscriptions/finalize`, err);
  }
}

async function notifySubscriptionsFailure(env: Env, tx: Record<string, unknown>, reason: string, cid: string): Promise<void> {
  if (!env.QUORUM_SUBSCRIPTIONS_URL || !env.QUORUM_SUBSCRIPTIONS_API_KEY) {
    console.warn(`[${cid}] QUORUM_SUBSCRIPTIONS_URL not configured, skipping subscription failure notification`);
    return;
  }

  try {
    const res = await fetch(`${env.QUORUM_SUBSCRIPTIONS_URL}/handle-failure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.QUORUM_SUBSCRIPTIONS_API_KEY,
      },
      body: JSON.stringify({
        orgId: tx.orgId,
        orderId: tx.depositId || tx.referenceId,
        reason,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[${cid}] quorum-subscriptions/handle-failure failed: ${res.status} ${errBody.slice(0, 200)}`);
    } else {
      console.log(`[${cid}] Subscription failure notified via quorum-subscriptions for org ${tx.orgId}`);
    }
  } catch (err) {
    console.error(`[${cid}] Failed to call quorum-subscriptions/handle-failure`, err);
  }
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
