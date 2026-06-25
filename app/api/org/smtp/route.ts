import { NextResponse } from 'next/server';
import { updateFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';
import { encryptSmtpPass } from '@/lib/email/encrypt-smtp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpFromName } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (smtpHost !== undefined) data.smtpHost = smtpHost || null;
    if (smtpPort !== undefined) data.smtpPort = smtpPort ? parseInt(smtpPort) : null;
    if (smtpUser !== undefined) data.smtpUser = smtpUser || null;
    if (smtpPass !== undefined) data.smtpPass = smtpPass ? encryptSmtpPass(smtpPass) : null;
    if (smtpFromEmail !== undefined) data.smtpFromEmail = smtpFromEmail || null;
    if (smtpFromName !== undefined) data.smtpFromName = smtpFromName || null;

    await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SMTP save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save SMTP settings' },
      { status: 500 }
    );
  }
}
