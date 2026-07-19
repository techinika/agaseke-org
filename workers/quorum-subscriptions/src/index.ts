import {
  Env,
  generateCorrelationId,
  jsonResp,
  errorResp,
  verifyFirebaseToken,
  getFirebaseAccessToken,
  firestoreGet,
  firestoreQuery,
  firestoreUpdate,
  firestoreCreate,
} from './helpers';
import {
  calculateSubscriptionPrice,
  getSubscriptionEndDate,
  SUBSCRIPTION_PLANS,
  MAX_SUBSCRIPTION_MONTHS,
} from './pricing';

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
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
        },
      });
    }

    if (method === 'GET' && path === '/health') {
      return jsonResp({ status: 'ok', worker: 'quorum-subscriptions' }, 200, env);
    }

    // Cron endpoints — authorized via Bearer token
    if (path === '/renewal-reminder' || path === '/expiry') {
      const authHeader = request.headers.get('Authorization');
      if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return errorResp('Unauthorized', 401, env);
      }
      if (path === '/renewal-reminder') return handleRenewalReminder(env);
      if (path === '/expiry') return handleExpiry(env);
    }

    // API endpoints — authorized via X-API-Key (from frontend or other workers)
    if (method === 'POST' && path === '/get-info') {
      return handleGetInfo(request, env);
    }
    if (method === 'POST' && path === '/calculate-price') {
      return handleCalculatePrice(request, env);
    }
    if (method === 'POST' && path === '/change-plan') {
      return handleChangePlan(request, env);
    }
    if (method === 'POST' && path === '/finalize') {
      return handleFinalize(request, env);
    }
    if (method === 'POST' && path === '/handle-failure') {
      return handleFailure(request, env);
    }

    return errorResp('Not found', 404, env);
  },
};

function verifyApiKey(request: Request, env: Env): boolean {
  return request.headers.get('X-API-Key') === env.API_KEY;
}

// ─── GET INFO ──────────────────────────────────────────────────────────────────
// Returns current subscription info for an org. Frontend calls this directly.

async function handleGetInfo(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('si');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { slug } = body as { slug: string };

    if (!slug) return errorResp('Missing slug', 400, env);

    // Verify Firebase token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResp('Unauthorized', 401, env);
    const token = authHeader.slice(7);
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) return errorResp('Invalid token', 401, env);

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_PROJECT_ID;

    const org = await firestoreGet('organizations', slug, accessToken, projectId);
    if (!org) return errorResp('Organization not found', 404, env);

    const adminIds = (org.adminIds as string[]) || [];
    if (!adminIds.includes(decoded.user_id || decoded.sub || '')) {
      return errorResp('Forbidden', 403, env);
    }

    const plan = (org.subscriptionPlan as string) || 'starter';
    const months = (org.subscriptionMonths as number) || 1;
    const startDate = org.subscriptionStartDate as string | undefined;
    const endDate = org.subscriptionEndDate as string | undefined;

    const pricing = calculateSubscriptionPrice(plan, months);

    return jsonResp({
      plan,
      months,
      startDate,
      endDate,
      pricing,
      maxMembers: SUBSCRIPTION_PLANS[plan]?.maxMembers || 500,
    }, 200, env);
  } catch (err) {
    console.error(`[${cid}] get-info error`, err);
    return errorResp('Failed to get subscription info', 500, env);
  }
}

// ─── CALCULATE PRICE ───────────────────────────────────────────────────────────
// Returns pricing breakdown for a given plan + months. Used for live preview.

async function handleCalculatePrice(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('cp');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { plan, months } = body as { plan: string; months: number };

    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return errorResp('Invalid plan', 400, env);
    }

    const clampedMonths = Math.max(1, Math.min(MAX_SUBSCRIPTION_MONTHS, months || 1));
    const pricing = calculateSubscriptionPrice(plan, clampedMonths);

    return jsonResp(pricing, 200, env);
  } catch (err) {
    console.error(`[${cid}] calculate-price error`, err);
    return errorResp('Failed to calculate price', 500, env);
  }
}

// ─── CHANGE PLAN ───────────────────────────────────────────────────────────────
// Main endpoint: creates subscription transaction and initiates payment via quorum-payments.

async function handleChangePlan(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('sc');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { slug, plan, months } = body as { slug: string; plan: string; months?: number };

    if (!slug || !plan) return errorResp('Missing required fields', 400, env);
    if (!SUBSCRIPTION_PLANS[plan]) return errorResp('Invalid plan', 400, env);

    // Verify Firebase token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResp('Unauthorized', 401, env);
    const token = authHeader.slice(7);
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) return errorResp('Invalid token', 401, env);

    const userId = decoded.user_id || decoded.sub || '';
    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_PROJECT_ID;

    const org = await firestoreGet('organizations', slug, accessToken, projectId);
    if (!org) return errorResp('Organization not found', 404, env);

    const adminIds = (org.adminIds as string[]) || [];
    if (!adminIds.includes(userId)) {
      return errorResp('Forbidden', 403, env);
    }

    const orgId = org.id as string || slug;
    const targetPlan = plan as string;
    const subscriptionMonths = Math.max(1, Math.min(MAX_SUBSCRIPTION_MONTHS, months || 1));

    // Starter plan — direct downgrade, no payment needed
    if (targetPlan === 'starter') {
      await firestoreUpdate('organizations', slug, {
        subscriptionPlan: 'starter',
        subscriptionMonths: 1,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
      }, accessToken, projectId);

      return jsonResp({
        success: true,
        requiresPayment: false,
        plan: 'starter',
        months: 1,
      }, 200, env);
    }

    // Calculate price for paid plans
    const pricing = calculateSubscriptionPrice(targetPlan, subscriptionMonths);

    // Create subscription transaction
    const orderId = generateOrderId();
    await firestoreCreate('transactions', {
      orgId,
      userId,
      amount: pricing.total,
      platformFee: 0,
      orgReceives: pricing.total,
      currency: 'USD',
      type: 'subscription',
      targetPlan,
      targetBillingCycle: 'monthly',
      subscriptionMonths,
      referenceId: orderId,
      depositId: orderId,
      status: 'pending',
      paymentMethod: 'pesapal_card',
      createdAt: new Date().toISOString(),
    }, accessToken, projectId);

    console.log(`[${cid}] Created subscription transaction: orderId=${orderId}, plan=${targetPlan}, months=${subscriptionMonths}, total=${pricing.total}`);

    // Call quorum-payments to initiate PesaPal payment
    const appUrl = env.APP_URL || 'https://quorum-org-app.vercel.app';
    const returnUrl = `${appUrl}/org/${slug}/subscription/return/${orderId}`;

    const paymentRes = await fetch(`${env.QUORUM_PAYMENTS_URL}/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.QUORUM_PAYMENTS_API_KEY,
      },
      body: JSON.stringify({
        depositId: orderId,
        amount: pricing.total,
        returnUrl,
        reason: `Subscription: ${SUBSCRIPTION_PLANS[targetPlan].label} plan (${subscriptionMonths} month${subscriptionMonths > 1 ? 's' : ''})`,
        email: org.contactEmail || 'admin@quorum.org',
        name: org.name as string || 'Organization',
        slug,
        orgName: org.name as string || slug,
      }),
    });

    if (!paymentRes.ok) {
      const errBody = await paymentRes.text();
      console.error(`[${cid}] Payment initiation failed: ${paymentRes.status} ${errBody.slice(0, 200)}`);
      return errorResp('Failed to initiate payment', 500, env);
    }

    const paymentData = await paymentRes.json() as { redirectUrl: string; orderTrackingId: string };

    return jsonResp({
      success: true,
      requiresPayment: true,
      orderId,
      amount: pricing.total,
      plan: targetPlan,
      months: subscriptionMonths,
      pricing,
      redirectUrl: paymentData.redirectUrl,
    }, 200, env);
  } catch (err) {
    console.error(`[${cid}] change-plan error`, err);
    return errorResp('Failed to change plan', 500, env);
  }
}

// ─── FINALIZE ──────────────────────────────────────────────────────────────────
// Called by quorum-payments when a subscription payment completes.

async function handleFinalize(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('sf');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { orgId, targetPlan, subscriptionMonths } = body as {
      orgId: string;
      targetPlan: string;
      subscriptionMonths?: number;
    };

    if (!orgId || !targetPlan) return errorResp('Missing required fields', 400, env);

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_PROJECT_ID;

    const months = subscriptionMonths || 1;
    const startDate = new Date().toISOString();
    const endDate = getSubscriptionEndDate(months);

    await firestoreUpdate('organizations', orgId, {
      subscriptionPlan: targetPlan,
      subscriptionMonths: months,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    }, accessToken, projectId);

    console.log(`[${cid}] Subscription finalized: orgId=${orgId}, plan=${targetPlan}, months=${months}, endDate=${endDate}`);

    // Send confirmation email
    await sendSubscriptionConfirmation(env, orgId, targetPlan, months, accessToken, projectId);

    return jsonResp({ success: true, plan: targetPlan, months, endDate }, 200, env);
  } catch (err) {
    console.error(`[${cid}] finalize error`, err);
    return errorResp('Failed to finalize subscription', 500, env);
  }
}

// ─── HANDLE FAILURE ────────────────────────────────────────────────────────────
// Called by quorum-payments when a subscription payment fails.

async function handleFailure(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('sf');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { orgId, reason } = body as {
      orgId: string;
      reason?: string;
    };

    console.log(`[${cid}] Subscription payment failed: orgId=${orgId}, reason=${reason || 'none'}`);

    // No state change needed — plan wasn't upgraded yet
    return jsonResp({ success: true }, 200, env);
  } catch (err) {
    console.error(`[${cid}] handle-failure error`, err);
    return errorResp('Failed to handle subscription failure', 500, env);
  }
}

// ─── RENEWAL REMINDER ─────────────────────────────────────────────────────────
// Called by quorum-cron daily. Sends reminders for subscriptions expiring in 3 days.

async function handleRenewalReminder(env: Env): Promise<Response> {
  const cid = generateCorrelationId('rr');
  try {
    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_PROJECT_ID;

    const now = Date.now();
    const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;
    const results = { checked: 0, remindersSent: 0, errors: 0 };

    // Get all orgs with non-starter plans
    const orgs = await firestoreQuery('organizations', 'subscriptionPlan', 'growth', accessToken, projectId);
    const enterpriseOrgs = await firestoreQuery('organizations', 'subscriptionPlan', 'enterprise', accessToken, projectId);
    const allPaidOrgs = [...orgs, ...enterpriseOrgs];

    for (const org of allPaidOrgs) {
      results.checked++;
      try {
        const endDate = org.subscriptionEndDate as string | undefined;
        if (!endDate) continue;

        const endDateTime = new Date(endDate).getTime();
        if (endDateTime > threeDaysFromNow || endDateTime <= now) continue;

        const orgId = org.id as string;
        const slug = org.slug as string;
        const orgName = org.name as string;

        // Get admin emails
        const adminIds = (org.adminIds as string[]) || [];
        for (const uid of adminIds) {
          const user = await firestoreGet('users', uid, accessToken, projectId);
          if (!user?.email) continue;

          const plan = (org.subscriptionPlan as string) || 'starter';
          const planLabel = SUBSCRIPTION_PLANS[plan]?.label || plan;

          await sendReminderEmail(env, user.email as string, orgId, {
            orgName,
            planLabel,
            endDate: new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            renewUrl: `${env.APP_URL}/org/${slug}/subscription`,
          });
          results.remindersSent++;
        }
      } catch (err) {
        console.error(`[${cid}] reminder error for org ${org.id}`, err);
        results.errors++;
      }
    }

    console.log(`[${cid}] renewal-reminder done:`, JSON.stringify(results));
    return jsonResp(results, 200, env);
  } catch (err) {
    console.error(`[${cid}] renewal-reminder error`, err);
    return errorResp('Renewal reminder failed', 500, env);
  }
}

// ─── EXPIRY ────────────────────────────────────────────────────────────────────
// Called by quorum-cron daily. Downgrades expired subscriptions to starter.

async function handleExpiry(env: Env): Promise<Response> {
  const cid = generateCorrelationId('se');
  try {
    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const projectId = env.FIREBASE_PROJECT_ID;

    const now = Date.now();
    const results = { checked: 0, expired: 0, errors: 0 };

    const orgs = await firestoreQuery('organizations', 'subscriptionPlan', 'growth', accessToken, projectId);
    const enterpriseOrgs = await firestoreQuery('organizations', 'subscriptionPlan', 'enterprise', accessToken, projectId);
    const allPaidOrgs = [...orgs, ...enterpriseOrgs];

    for (const org of allPaidOrgs) {
      results.checked++;
      try {
        const endDate = org.subscriptionEndDate as string | undefined;
        if (!endDate) continue;

        const endDateTime = new Date(endDate).getTime();
        if (endDateTime > now) continue;

        const orgId = org.id as string;
        const slug = org.slug as string;
        const orgName = org.name as string;

        // Downgrade to starter
        await firestoreUpdate('organizations', slug, {
          subscriptionPlan: 'starter',
          subscriptionMonths: 1,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
        }, accessToken, projectId);

        results.expired++;

        // Notify admins
        const adminIds = (org.adminIds as string[]) || [];
        for (const uid of adminIds) {
          const user = await firestoreGet('users', uid, accessToken, projectId);
          if (!user?.email) continue;

          await sendExpiryEmail(env, user.email as string, orgId, {
            orgName,
            endDate: new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            renewUrl: `${env.APP_URL}/org/${slug}/subscription`,
          });
        }
      } catch (err) {
        console.error(`[${cid}] expiry error for org ${org.id}`, err);
        results.errors++;
      }
    }

    console.log(`[${cid}] expiry done:`, JSON.stringify(results));
    return jsonResp(results, 200, env);
  } catch (err) {
    console.error(`[${cid}] expiry error`, err);
    return errorResp('Subscription expiry failed', 500, env);
  }
}

// ─── Email Helpers ─────────────────────────────────────────────────────────────

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  if (!env.QUORUM_COMM_URL || !env.QUORUM_COMM_API_KEY) {
    console.warn(`[EMAIL] quorum-comm not configured. Would send to ${to}: ${subject}`);
    return;
  }

  const res = await fetch(`${env.QUORUM_COMM_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.QUORUM_COMM_API_KEY,
    },
    body: JSON.stringify({ to, subject, html }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[EMAIL] quorum-comm returned ${res.status}: ${errBody.slice(0, 200)}`);
  }
}

async function sendSubscriptionConfirmation(
  env: Env, orgId: string, plan: string, months: number,
  accessToken: string, projectId: string
): Promise<void> {
  const org = await firestoreGet('organizations', orgId, accessToken, projectId);
  if (!org) return;

  const adminIds = (org.adminIds as string[]) || [];
  const orgName = (org.name as string) || 'Organization';
  const planLabel = SUBSCRIPTION_PLANS[plan]?.label || plan;
  const endDate = org.subscriptionEndDate as string | undefined;
  const pricing = calculateSubscriptionPrice(plan, months);

  const formattedEndDate = endDate
    ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#FF0000;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:18px;font-weight:600">Subscription Confirmed</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#333;margin:0 0 16px">Your subscription to <strong>${orgName}</strong> has been confirmed.</p>
        <table style="width:100%;background:#f9fafb;border-radius:8px;padding:16px;margin:0 0 16px">
          <tr><td style="padding:8px;color:#666">Plan</td><td style="padding:8px;text-align:right;font-weight:600">${planLabel}</td></tr>
          <tr><td style="padding:8px;color:#666">Duration</td><td style="padding:8px;text-align:right">${months} month${months > 1 ? 's' : ''}</td></tr>
          <tr><td style="padding:8px;color:#666">Total Paid</td><td style="padding:8px;text-align:right;font-weight:600">$${pricing.total.toFixed(2)}</td></tr>
          ${pricing.hasDiscount ? `<tr><td style="padding:8px;color:#666">Discount</td><td style="padding:8px;text-align:right;color:#16a34a">-$${pricing.discountAmount.toFixed(2)} (10%)</td></tr>` : ''}
          <tr><td style="padding:8px;color:#666">Valid Until</td><td style="padding:8px;text-align:right;font-weight:600">${formattedEndDate}</td></tr>
        </table>
        <p style="color:#666;font-size:14px;margin:0">Your subscription will automatically renew. You can manage it from your dashboard.</p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Powered by Quorum</p>
    </div>
  `;

  for (const uid of adminIds) {
    const user = await firestoreGet('users', uid, accessToken, projectId);
    if (!user?.email) continue;
    await sendEmail(env, user.email as string, `Subscription Confirmed — ${orgName}`, html);
  }
}

async function sendReminderEmail(
  env: Env, to: string, orgId: string,
  params: { orgName: string; planLabel: string; endDate: string; renewUrl: string }
): Promise<void> {
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#FF0000;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:18px;font-weight:600">Subscription Renewal Reminder</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#333;margin:0 0 16px">Your <strong>${params.planLabel}</strong> subscription for <strong>${params.orgName}</strong> expires on <strong>${params.endDate}</strong>.</p>
        <p style="color:#666;margin:0 0 16px">To avoid interruption, please renew your subscription before the expiry date.</p>
        <a href="${params.renewUrl}" style="display:inline-block;background:#FF0000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Renew Now</a>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Powered by Quorum</p>
    </div>
  `;
  await sendEmail(env, to, `Subscription Expiring Soon — ${params.orgName}`, html);
}

async function sendExpiryEmail(
  env: Env, to: string, orgId: string,
  params: { orgName: string; endDate: string; renewUrl: string }
): Promise<void> {
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#FF0000;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:18px;font-weight:600">Subscription Expired</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#333;margin:0 0 16px">Your subscription for <strong>${params.orgName}</strong> expired on <strong>${params.endDate}</strong>.</p>
        <p style="color:#666;margin:0 0 16px">Your organization has been downgraded to the Starter plan. You can resubscribe at any time.</p>
        <a href="${params.renewUrl}" style="display:inline-block;background:#FF0000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Resubscribe</a>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Powered by Quorum</p>
    </div>
  `;
  await sendEmail(env, to, `Subscription Expired — ${params.orgName}`, html);
}

function generateOrderId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
