import {
  Env,
  EmailRequest,
  generateCorrelationId,
  jsonResp,
  errorResp,
  getFirebaseAccessToken,
  firestoreGet,
} from './helpers';
import {
  paymentConfirmationTemplate,
  paymentFailedTemplate,
  paymentReminderTemplate,
  newDonationNotificationTemplate,
  newMemberNotificationTemplate,
} from './templates';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://quorum.app',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        },
      });
    }

    if (method === 'POST' && path === '/send') {
      return handleSend(request, env);
    }
    if (method === 'POST' && path === '/send-confirmation') {
      return handleSendConfirmation(request, env);
    }
    if (method === 'POST' && path === '/send-failure') {
      return handleSendFailure(request, env);
    }
    if (method === 'POST' && path === '/send-reminder') {
      return handleSendReminder(request, env);
    }
    if (method === 'POST' && path === '/notify-admins') {
      return handleNotifyAdmins(request, env);
    }
    if (method === 'GET' && path === '/health') {
      return jsonResp({ status: 'ok', worker: 'quorum-comm' }, 200, env);
    }

    return errorResp('Not found', 404, env);
  },
};

function verifyApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === env.API_KEY;
}

async function getOrgBranding(orgId: string, env: Env) {
  const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
  const org = await firestoreGet('organizations', orgId, accessToken, env.FIREBASE_PROJECT_ID);
  if (!org) return {};
  return {
    orgName: org.name as string | undefined,
    orgLogoURL: org.logoURL as string | undefined,
    brandColor: org.brandColor as string | undefined,
    websiteUrl: org.websiteUrl as string | undefined,
    contactEmail: org.contactEmail as string | undefined,
    contactPhone: org.contactPhone as string | undefined,
    footerText: org.footerText as string | undefined,
    slug: org.slug as string | undefined,
  };
}

async function handleSend(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('cs');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { to, toName, subject, html, text } = body as EmailRequest;

    if (!to || !subject || !html) {
      return errorResp('Missing required fields: to, subject, html', 400, env);
    }

    const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@quorum.app';
    const fromName = process.env.DEFAULT_FROM_NAME || 'Quorum';

    await env.EMAIL.send({
      to,
      from: { email: fromEmail, name: fromName },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    console.log(`[${cid}] Email sent to ${to}: ${subject}`);
    return jsonResp({ success: true, correlationId: cid }, 200, env);
  } catch (error) {
    console.error(`[${cid}] Send failed:`, error);
    return errorResp(`Email send failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, env);
  }
}

async function handleSendConfirmation(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('cc');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { to, toName, orgId, type, amount, currency, transactionId, description } = body as {
      to: string;
      toName?: string;
      orgId: string;
      type: 'donation' | 'membership';
      amount: number;
      currency: string;
      transactionId: string;
      description?: string;
    };

    if (!to || !orgId || !amount || !transactionId) {
      return errorResp('Missing required fields', 400, env);
    }

    const branding = await getOrgBranding(orgId, env);

    const html = paymentConfirmationTemplate({
      recipientName: toName || 'User',
      amount: amount.toFixed(2),
      currency: currency || 'USD',
      type,
      orgName: branding.orgName || 'Organization',
      orgLogoURL: branding.orgLogoURL,
      brandColor: branding.brandColor,
      transactionId,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      description,
      websiteUrl: branding.websiteUrl,
      contactEmail: branding.contactEmail,
      contactPhone: branding.contactPhone,
      footerText: branding.footerText,
    });

    const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@quorum.app';
    const fromName = process.env.DEFAULT_FROM_NAME || 'Quorum';

    await env.EMAIL.send({
      to,
      from: { email: fromEmail, name: branding.orgName || fromName },
      subject: `${type === 'donation' ? 'Donation Receipt' : 'Payment Confirmed'} — ${branding.orgName || 'Organization'}`,
      html,
    });

    console.log(`[${cid}] Confirmation sent to ${to} for ${currency} ${amount}`);
    return jsonResp({ success: true, correlationId: cid }, 200, env);
  } catch (error) {
    console.error(`[${cid}] Confirmation failed:`, error);
    return errorResp(`Email send failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, env);
  }
}

async function handleSendFailure(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('cf');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { to, toName, orgId, type, amount, currency, failureReason, retryUrl } = body as {
      to: string;
      toName?: string;
      orgId: string;
      type: 'donation' | 'membership';
      amount: number;
      currency: string;
      failureReason?: string;
      retryUrl?: string;
    };

    if (!to || !orgId || !amount) {
      return errorResp('Missing required fields', 400, env);
    }

    const branding = await getOrgBranding(orgId, env);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quorum.app';

    const html = paymentFailedTemplate({
      recipientName: toName || 'User',
      amount: amount.toFixed(2),
      currency: currency || 'USD',
      type,
      orgName: branding.orgName || 'Organization',
      orgLogoURL: branding.orgLogoURL,
      brandColor: branding.brandColor,
      failureReason,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      retryUrl: retryUrl || `${appUrl}/org/${branding.slug || ''}/${type === 'donation' ? 'donate' : 'join'}`,
      websiteUrl: branding.websiteUrl,
      contactEmail: branding.contactEmail,
      contactPhone: branding.contactPhone,
      footerText: branding.footerText,
    });

    const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@quorum.app';
    const fromName = process.env.DEFAULT_FROM_NAME || 'Quorum';

    await env.EMAIL.send({
      to,
      from: { email: fromEmail, name: branding.orgName || fromName },
      subject: `Payment Failed — ${branding.orgName || 'Organization'}`,
      html,
    });

    console.log(`[${cid}] Failure notification sent to ${to}`);
    return jsonResp({ success: true, correlationId: cid }, 200, env);
  } catch (error) {
    console.error(`[${cid}] Failure notification failed:`, error);
    return errorResp(`Email send failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, env);
  }
}

async function handleSendReminder(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('cr');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { to, toName, orgId, type, amount, currency, renewalDate, renewUrl } = body as {
      to: string;
      toName?: string;
      orgId: string;
      type: 'donation' | 'membership';
      amount: number;
      currency: string;
      renewalDate: string;
      renewUrl?: string;
    };

    if (!to || !orgId || !amount) {
      return errorResp('Missing required fields', 400, env);
    }

    const branding = await getOrgBranding(orgId, env);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quorum.app';

    const html = paymentReminderTemplate({
      recipientName: toName || 'User',
      amount: amount.toFixed(2),
      currency: currency || 'USD',
      type,
      orgName: branding.orgName || 'Organization',
      orgLogoURL: branding.orgLogoURL,
      brandColor: branding.brandColor,
      renewalDate,
      renewUrl: renewUrl || `${appUrl}/org/${branding.slug || ''}/${type === 'donation' ? 'donate' : 'join'}`,
      websiteUrl: branding.websiteUrl,
      contactEmail: branding.contactEmail,
      contactPhone: branding.contactPhone,
      footerText: branding.footerText,
    });

    const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@quorum.app';
    const fromName = process.env.DEFAULT_FROM_NAME || 'Quorum';

    await env.EMAIL.send({
      to,
      from: { email: fromEmail, name: branding.orgName || fromName },
      subject: `Renewal Reminder — ${branding.orgName || 'Organization'}`,
      html,
    });

    console.log(`[${cid}] Reminder sent to ${to}`);
    return jsonResp({ success: true, correlationId: cid }, 200, env);
  } catch (error) {
    console.error(`[${cid}] Reminder failed:`, error);
    return errorResp(`Email send failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, env);
  }
}

async function handleNotifyAdmins(request: Request, env: Env): Promise<Response> {
  const cid = generateCorrelationId('cn');
  try {
    if (!verifyApiKey(request, env)) return errorResp('Unauthorized', 401, env);

    const body = await request.json();
    const { orgId, subject, html } = body as {
      orgId: string;
      subject: string;
      html: string;
    };

    if (!orgId || !subject || !html) {
      return errorResp('Missing required fields', 400, env);
    }

    const accessToken = await getFirebaseAccessToken(env.FIREBASE_ADMIN_CLIENT_EMAIL, env.FIREBASE_ADMIN_PRIVATE_KEY);
    const org = await firestoreGet('organizations', orgId, accessToken, env.FIREBASE_PROJECT_ID);
    if (!org) return errorResp('Organization not found', 404, env);

    const branding = await getOrgBranding(orgId, env);
    const adminIds = (org.adminIds as string[]) || [];

    const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@quorum.app';
    const fromName = process.env.DEFAULT_FROM_NAME || 'Quorum';

    let sentCount = 0;
    for (const uid of adminIds) {
      const user = await firestoreGet('users', uid, accessToken, env.FIREBASE_PROJECT_ID);
      if (!user?.email) continue;

      await env.EMAIL.send({
        to: user.email as string,
        from: { email: fromEmail, name: branding.orgName || fromName },
        subject,
        html,
      });
      sentCount++;
    }

    console.log(`[${cid}] Admin notification sent to ${sentCount} admins for org ${orgId}`);
    return jsonResp({ success: true, sentCount, correlationId: cid }, 200, env);
  } catch (error) {
    console.error(`[${cid}] Admin notification failed:`, error);
    return errorResp(`Email send failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, env);
  }
}
