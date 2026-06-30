import { NextResponse } from 'next/server';
import { updateFirestoreDocument, readFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';
import { encryptSmtpPass } from '@/lib/email/encrypt-smtp';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { smtpSettingsSchema } from '@/lib/api-validations';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const correlationId = `smtp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logger.info('org-smtp', `Request received [${correlationId}]`);

  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      logger.warn('org-smtp', `Missing auth token [${correlationId}]`);
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const decoded = await verifyFirebaseToken(idToken);
    if (!decoded) {
      logger.warn('org-smtp', `Invalid auth token [${correlationId}]`);
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }
    logger.info('org-smtp', `User ${decoded.uid} authenticated [${correlationId}]`);

    const body = await request.json();
    const parsed = smtpSettingsSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('org-smtp', `Validation failed [${correlationId}]`, parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orgId, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpFromName } = parsed.data;

    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
    if (!org) {
      logger.warn('org-smtp', `Org ${orgId} not found [${correlationId}]`);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const adminIds = (org?.adminIds as string[]) || [];
    if (!adminIds.includes(decoded.uid)) {
      logger.warn('org-smtp', `User ${decoded.uid} is not admin of org ${orgId} [${correlationId}]`);
      return NextResponse.json({ error: 'You are not an admin of this organization' }, { status: 403 });
    }
    logger.info('org-smtp', `Admin verified for org ${orgId} [${correlationId}]`);

    const data: Record<string, unknown> = {};
    if (smtpHost !== undefined) data.smtpHost = smtpHost || null;
    if (smtpPort !== undefined) {
      const portStr = smtpPort !== '' && smtpPort != null ? String(smtpPort) : '';
      const port = portStr ? parseInt(portStr, 10) : null;
      if (port !== null && (isNaN(port) || port < 1 || port > 65535)) {
        logger.warn('org-smtp', `Invalid SMTP port ${smtpPort} [${correlationId}]`);
        return NextResponse.json({ error: 'SMTP port must be between 1 and 65535' }, { status: 400 });
      }
      data.smtpPort = port;
    }
    if (smtpUser !== undefined) data.smtpUser = smtpUser || null;
    if (smtpPass !== undefined) {
      data.smtpPass = smtpPass ? encryptSmtpPass(smtpPass) : null;
      logger.info('org-smtp', `SMTP password ${smtpPass ? 'encrypted' : 'cleared'} [${correlationId}]`);
    }
    if (smtpFromEmail !== undefined) {
      data.smtpFromEmail = smtpFromEmail
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpFromEmail)
          ? smtpFromEmail
          : null
        : null;
    }
    if (smtpFromName !== undefined) data.smtpFromName = smtpFromName || null;

    await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId, data);
    logger.info('org-smtp', `SMTP settings saved for org ${orgId} [${correlationId}]`);

    return NextResponse.json({ success: true, encryptedPass: !!smtpPass });
  } catch (error) {
    logger.error('org-smtp', `Top-level error [${correlationId}]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save SMTP settings' },
      { status: 500 }
    );
  }
}
