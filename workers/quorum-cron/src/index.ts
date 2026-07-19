interface Env {
  CRON_SECRET: string;
  FIREBASE_ADMIN_CLIENT_EMAIL: string;
  FIREBASE_ADMIN_PRIVATE_KEY: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  DEFAULT_FROM_EMAIL: string;
  DEFAULT_FROM_NAME: string;
  APP_URL: string;
  QUORUM_PAYMENTS_URL: string;
  QUORUM_COMM_URL: string;
  QUORUM_SUBSCRIPTIONS_URL: string;
  API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Origin': 'https://quorum.app', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' },
      });
    }

    const authHeader = request.headers.get('Authorization');
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return jsonResp({ error: 'Unauthorized' }, 401);
    }

    if (path === '/reconcile') {
      return handleReconcile(env);
    }
    if (path === '/payment-reminders') {
      return handlePaymentReminders(env);
    }
    if (path === '/membership-expiry') {
      return handleMembershipExpiry(env);
    }
    if (path === '/subscription-renewal') {
      return handleSubscriptionRenewal(env);
    }
    if (path === '/subscription-expiry') {
      return handleSubscriptionExpiry(env);
    }

    return jsonResp({ error: 'Not found' }, 404);
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Cron triggered at', new Date(event.scheduledTime).toISOString());
    await handleReconcile(env);
    await handlePaymentReminders(env);
    await handleMembershipExpiry(env);
    await handleSubscriptionRenewal(env);
    await handleSubscriptionExpiry(env);
  },
};

// ─── Reconcile ───────────────────────────────────────────────────────────────

async function handleReconcile(env: Env): Promise<Response> {
  const cid = genCid('rec');
  try {
    if (!env.QUORUM_PAYMENTS_URL || !env.API_KEY) {
      console.error(`[${cid}] QUORUM_PAYMENTS_URL or API_KEY not configured`);
      return jsonResp({ error: 'Payments worker not configured' }, 500);
    }

    console.log(`[${cid}] calling quorum-payments /reconcile`);
    const res = await fetch(`${env.QUORUM_PAYMENTS_URL}/reconcile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const results = await res.json();
    console.log(`[${cid}] reconcile result:`, JSON.stringify(results));
    return jsonResp(results);
  } catch (err) {
    console.error(`[${cid}] reconcile error`, err);
    return jsonResp({ error: 'Reconciliation failed' }, 500);
  }
}

// ─── Payment Reminders ───────────────────────────────────────────────────────

async function handlePaymentReminders(env: Env): Promise<Response> {
  const cid = genCid('rem');
  try {
    const { accessToken, projectId } = await getFirebaseAuth(env);
    const results = { remindersSent: 0, membershipsChecked: 0, donationsChecked: 0, errors: 0, skippedDuplicates: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;

    // Process membership reminders
    const memberships = await firestoreQuery('memberships', 'status', 'active', accessToken, projectId);
    for (const membership of memberships) {
      results.membershipsChecked++;
      try {
        const renewsAt = membership.renewsAt as string | undefined;
        if (!renewsAt || renewsAt === 'null') continue;

        const lastReminderDate = membership.lastReminderDate as string | undefined;
        if (lastReminderDate === today) { results.skippedDuplicates++; continue; }

        const renewsAtTime = new Date(renewsAt).getTime();
        if (renewsAtTime > threeDaysFromNow || renewsAtTime <= now) continue;

        const userId = membership.userId as string;
        const orgId = membership.orgId as string;
        const tierId = membership.tierId as string;

        const org = await firestoreGet('organizations', orgId, accessToken, projectId);
        if (!org) continue;

        const tier = await firestoreGet(`organizations/${orgId}/tiers`, tierId, accessToken, projectId);
        const tierName = (tier?.name as string) || 'Member';
        const tierPrice = (tier?.price as number) || 0;

        const user = await firestoreGet('users', userId, accessToken, projectId);
        if (!user?.email) continue;

        const slug = org.slug as string;
        const orgName = org.name as string;

        const orgIdForComm = orgId;

        await sendEmail(env, {
          to: user.email as string,
          orgId: orgIdForComm,
          subject: `Membership Renewal Reminder — ${orgName}`,
          html: paymentReminderHtml({
            recipientName: (user.displayName as string) || 'Member',
            amount: tierPrice.toFixed(2),
            orgName,
            brandColor: (org.brandColor as string) || '#FF0000',
            dueDate: new Date(renewsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            type: 'membership',
            description: tierName,
            paymentUrl: `${env.APP_URL}/org/${slug}/join`,
          }),
        });

        await firestoreUpdate('memberships', membership.id, { lastReminderDate: today }, accessToken, projectId);
        results.remindersSent++;
      } catch (err) {
        console.error(`[${cid}] membership reminder error for ${membership.id}`, err);
        results.errors++;
      }
    }

    // Process donation reminders
    const donations = await firestoreQuery('donations', 'status', 'active', accessToken, projectId);
    for (const donation of donations) {
      results.donationsChecked++;
      try {
        const frequency = donation.frequency as string | undefined;
        if (frequency === 'one_time') continue;

        const nextBillingDate = donation.nextBillingDate as string | undefined;
        if (!nextBillingDate) continue;

        const lastReminderDate = donation.lastReminderDate as string | undefined;
        if (lastReminderDate === today) { results.skippedDuplicates++; continue; }

        const billingTime = new Date(nextBillingDate).getTime();
        if (billingTime > threeDaysFromNow || billingTime <= now) continue;

        const orgId = donation.orgId as string;
        const org = await firestoreGet('organizations', orgId, accessToken, projectId);
        if (!org) continue;

        const donorEmail = donation.donorEmail as string | undefined;
        if (!donorEmail) continue;

        const slug = org.slug as string;

        await sendEmail(env, {
          to: donorEmail,
          orgId,
          subject: `Donation Reminder — ${org.name as string}`,
          html: paymentReminderHtml({
            recipientName: (donation.donorName as string) || 'Supporter',
            amount: (donation.amount as number).toFixed(2),
            orgName: org.name as string,
            brandColor: (org.brandColor as string) || '#FF0000',
            dueDate: new Date(nextBillingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            type: 'donation',
            description: undefined,
            paymentUrl: `${env.APP_URL}/org/${slug}/donate`,
          }),
        });

        await firestoreUpdate('donations', donation.id, { lastReminderDate: today }, accessToken, projectId);
        results.remindersSent++;
      } catch (err) {
        console.error(`[${cid}] donation reminder error for ${donation.id}`, err);
        results.errors++;
      }
    }

    console.log(`[${cid}] payment-reminders done:`, JSON.stringify(results));
    return jsonResp(results);
  } catch (err) {
    console.error(`[${cid}] payment-reminders error`, err);
    return jsonResp({ error: 'Payment reminders failed' }, 500);
  }
}

// ─── Membership Expiry ───────────────────────────────────────────────────────

async function handleMembershipExpiry(env: Env): Promise<Response> {
  const cid = genCid('exp');
  try {
    const { accessToken, projectId } = await getFirebaseAuth(env);
    const results = { expired: 0, notified: 0, errors: 0 };

    const memberships = await firestoreQuery('memberships', 'status', 'active', accessToken, projectId);
    for (const membership of memberships) {
      try {
        const renewsAt = membership.renewsAt as string | undefined;
        if (!renewsAt || renewsAt === 'null') continue;

        const renewsAtTime = new Date(renewsAt).getTime();
        if (renewsAtTime > Date.now()) continue;

        const membershipId = membership.id;
        const userId = membership.userId as string;
        const orgId = membership.orgId as string;
        const tierId = membership.tierId as string;

        await firestoreUpdate('memberships', membershipId, { status: 'expired' }, accessToken, projectId);

        if (orgId && userId) {
          await firestoreUpdate(`organizations/${orgId}/members`, userId, { status: 'expired' }, accessToken, projectId);
        }

        results.expired++;

        const org = await firestoreGet('organizations', orgId, accessToken, projectId);
        if (!org) continue;

        const tier = await firestoreGet(`organizations/${orgId}/tiers`, tierId, accessToken, projectId);
        const tierName = (tier?.name as string) || 'Member';

        const user = await firestoreGet('users', userId, accessToken, projectId);
        if (!user?.email) continue;

        const slug = org.slug as string;

        try {
          await sendEmail(env, {
            to: user.email as string,
            orgId,
            subject: `Membership Expired — ${org.name as string}`,
            html: membershipExpiryHtml({
              recipientName: (user.displayName as string) || 'Member',
              orgName: org.name as string,
              brandColor: (org.brandColor as string) || '#FF0000',
              tierName,
              expiredDate: new Date(renewsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              renewalUrl: `${env.APP_URL}/org/${slug}/join`,
            }),
          });
          results.notified++;
        } catch (emailErr) {
          console.error(`[${cid}] expiry email error for membership ${membershipId}`, emailErr);
        }
      } catch (err) {
        console.error(`[${cid}] membership expiry error for ${membership.id}`, err);
        results.errors++;
      }
    }

    console.log(`[${cid}] membership-expiry done:`, JSON.stringify(results));
    return jsonResp(results);
  } catch (err) {
    console.error(`[${cid}] membership-expiry error`, err);
    return jsonResp({ error: 'Membership expiry processing failed' }, 500);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genCid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://quorum.app' },
  });
}

// ─── Firebase Auth ───────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFirebaseAuth(env: Env): Promise<{ accessToken: string; projectId: string }> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return { accessToken: cachedToken.token, projectId: env.FIREBASE_ADMIN_CLIENT_EMAIL.split('@')[1]?.replace('.gserviceaccount.com', '') || '' };
  }

  const email = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId = email.split('@')[1]?.replace('.gserviceaccount.com', '') || '';

  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimSet = btoa(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/firebase', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${header}.${claimSet}`;

  const cryptoKey = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signatureInput));
  const encodedSig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signatureInput}.${encodedSig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  cachedToken = { token: tokenData.access_token, expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000 };
  return { accessToken: tokenData.access_token, projectId };
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

// ─── Firestore ───────────────────────────────────────────────────────────────

async function firestoreGet(collection: string, docId: string, accessToken: string, projectId: string): Promise<Record<string, unknown> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const doc = await res.json();
  return parseFirestoreDoc(doc);
}

async function firestoreQuery(collection: string, field: string, value: string, accessToken: string, projectId: string): Promise<Array<Record<string, unknown> & { id: string }>> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
      },
    }),
  });
  if (!res.ok) return [];
  const results = await res.json();
  return results.filter((r: Record<string, unknown>) => r.document).map((r: Record<string, unknown>) => {
    const doc = r.document as Record<string, unknown>;
    const name = doc.name as string;
    return { id: name.split('/').pop() || '', ...parseFirestoreDoc(doc) };
  });
}

async function firestoreUpdate(collectionPath: string, docId: string, data: Record<string, unknown>, accessToken: string, projectId: string): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}/${docId}`;
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) fields[key] = { nullValue: null };
    else if (typeof value === 'string') fields[key] = { stringValue: value };
    else if (typeof value === 'number') fields[key] = { doubleValue: value };
    else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
    else fields[key] = { stringValue: String(value) };
  }
  await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
}

function parseFirestoreDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const fields = doc.fields as Record<string, Record<string, unknown>> | undefined;
  if (!fields) return {};
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    if ('stringValue' in field) result[key] = field.stringValue;
    else if ('integerValue' in field) result[key] = Number(field.integerValue);
    else if ('doubleValue' in field) result[key] = field.doubleValue;
    else if ('booleanValue' in field) result[key] = field.booleanValue;
    else if ('timestampValue' in field) result[key] = field.timestampValue;
    else if ('nullValue' in field) result[key] = null;
  }
  return result;
}

// ─── Subscription Renewal & Expiry ────────────────────────────────────────────

async function handleSubscriptionRenewal(env: Env): Promise<Response> {
  const cid = genCid('srr');
  try {
    if (!env.QUORUM_SUBSCRIPTIONS_URL || !env.API_KEY) {
      console.warn(`[${cid}] QUORUM_SUBSCRIPTIONS_URL not configured`);
      return jsonResp({ error: 'Subscriptions worker not configured' }, 500);
    }

    console.log(`[${cid}] calling quorum-subscriptions /renewal-reminder`);
    const res = await fetch(`${env.QUORUM_SUBSCRIPTIONS_URL}/renewal-reminder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const results = await res.json();
    console.log(`[${cid}] subscription renewal reminder result:`, JSON.stringify(results));
    return jsonResp(results);
  } catch (err) {
    console.error(`[${cid}] subscription renewal reminder error`, err);
    return jsonResp({ error: 'Subscription renewal reminder failed' }, 500);
  }
}

async function handleSubscriptionExpiry(env: Env): Promise<Response> {
  const cid = genCid('sex');
  try {
    if (!env.QUORUM_SUBSCRIPTIONS_URL || !env.API_KEY) {
      console.warn(`[${cid}] QUORUM_SUBSCRIPTIONS_URL not configured`);
      return jsonResp({ error: 'Subscriptions worker not configured' }, 500);
    }

    console.log(`[${cid}] calling quorum-subscriptions /expiry`);
    const res = await fetch(`${env.QUORUM_SUBSCRIPTIONS_URL}/expiry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const results = await res.json();
    console.log(`[${cid}] subscription expiry result:`, JSON.stringify(results));
    return jsonResp(results);
  } catch (err) {
    console.error(`[${cid}] subscription expiry error`, err);
    return jsonResp({ error: 'Subscription expiry failed' }, 500);
  }
}

// ─── Email (via quorum-comm worker) ──────────────────────────────────────────

async function sendEmail(env: Env, options: { to: string; orgId: string; subject: string; html: string }): Promise<void> {
  if (!env.QUORUM_COMM_URL || !env.API_KEY) {
    console.warn(`[EMAIL] quorum-comm not configured. Would send to ${options.to}: ${options.subject}`);
    return;
  }

  try {
    const res = await fetch(`${env.QUORUM_COMM_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.API_KEY,
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[EMAIL] quorum-comm returned ${res.status}: ${errBody.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`[EMAIL] failed to call quorum-comm:`, err);
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function emailLayout(content: string, brandColor: string): string {
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(brandColor) ? brandColor : '#FF0000';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:24px"><div style="background:${safeColor};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0"><h1 style="margin:0;font-size:18px;font-weight:600">Quorum</h1></div><div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">${content}</div><p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Powered by Quorum</p></div></body></html>`;
}

function paymentReminderHtml(params: { recipientName: string; amount: string; orgName: string; brandColor: string; dueDate: string; type: string; description?: string; paymentUrl: string }): string {
  const name = escapeHtml(params.recipientName);
  const org = escapeHtml(params.orgName);
  const date = escapeHtml(params.dueDate);
  const desc = params.description ? escapeHtml(params.description) : '';
  const url = escapeHtml(params.paymentUrl);
  const content = `<h2 style="margin:0 0 16px;font-size:20px;color:#111">Payment Reminder</h2><p style="color:#555;margin:0 0 16px">Hi ${name},</p><p style="color:#555;margin:0 0 16px">Your ${params.type === 'membership' ? 'membership' : 'donation'} renewal for <strong>${org}</strong> is due on <strong>${date}</strong>.</p><div style="background:#f9fafb;padding:16px;border-radius:8px;margin:0 0 16px"><p style="margin:0;color:#111;font-size:16px"><strong>Amount: $${escapeHtml(params.amount)} USD</strong></p>${desc ? `<p style="margin:4px 0 0;color:#666;font-size:14px">${desc}</p>` : ''}</div><a href="${url}" style="display:inline-block;background:${params.brandColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Make Payment Now</a>`;
  return emailLayout(content, params.brandColor);
}

function membershipExpiryHtml(params: { recipientName: string; orgName: string; brandColor: string; tierName: string; expiredDate: string; renewalUrl: string }): string {
  const name = escapeHtml(params.recipientName);
  const org = escapeHtml(params.orgName);
  const tier = escapeHtml(params.tierName);
  const date = escapeHtml(params.expiredDate);
  const url = escapeHtml(params.renewalUrl);
  const content = `<h2 style="margin:0 0 16px;font-size:20px;color:#111">Membership Expired</h2><p style="color:#555;margin:0 0 16px">Hi ${name},</p><p style="color:#555;margin:0 0 16px">Your <strong>${tier}</strong> membership with <strong>${org}</strong> expired on <strong>${date}</strong>.</p><a href="${url}" style="display:inline-block;background:${params.brandColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Renew Membership</a>`;
  return emailLayout(content, params.brandColor);
}
