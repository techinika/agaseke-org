import { NextResponse } from 'next/server';
import { updateFirestoreDocument, readFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';
import { encryptSmtpPass } from '@/lib/email/encrypt-smtp';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { smtpSettingsSchema } from '@/lib/api-validations';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const decoded = await verifyFirebaseToken(idToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = smtpSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orgId, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpFromName } = parsed.data;

    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
    const adminIds = (org?.adminIds as string[]) || [];
    if (!adminIds.includes(decoded.uid)) {
      return NextResponse.json({ error: 'You are not an admin of this organization' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (smtpHost !== undefined) data.smtpHost = smtpHost || null;
    if (smtpPort !== undefined) {
      const portStr = smtpPort !== '' && smtpPort != null ? String(smtpPort) : '';
      const port = portStr ? parseInt(portStr, 10) : null;
      if (port !== null && (isNaN(port) || port < 1 || port > 65535)) {
        return NextResponse.json({ error: 'SMTP port must be between 1 and 65535' }, { status: 400 });
      }
      data.smtpPort = port;
    }
    if (smtpUser !== undefined) data.smtpUser = smtpUser || null;
    if (smtpPass !== undefined) data.smtpPass = smtpPass ? encryptSmtpPass(smtpPass) : null;
    if (smtpFromEmail !== undefined) {
      data.smtpFromEmail = smtpFromEmail
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpFromEmail)
          ? smtpFromEmail
          : null
        : null;
    }
    if (smtpFromName !== undefined) data.smtpFromName = smtpFromName || null;

    await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId, data);

    return NextResponse.json({ success: true, encryptedPass: !!smtpPass });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save SMTP settings' },
      { status: 500 }
    );
  }
}
