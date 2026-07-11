import { readFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';
import { sendViaSmtp } from './providers/smtp';
import { decryptSmtpPass } from './encrypt-smtp';

interface EmailAddress {
  email: string;
  name?: string;
}

interface EmailOptions {
  to: EmailAddress;
  subject: string;
  html: string;
  from?: EmailAddress;
}

const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || 'noreply@quorum.app';
const DEFAULT_FROM_NAME = process.env.DEFAULT_FROM_NAME || 'Quorum';

export async function sendEmail(options: EmailOptions, orgId?: string): Promise<void> {
  let from = options.from || { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };

  if (orgId) {
    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
    const smtpHost = org?.smtpHost as string | undefined;
    const smtpUser = org?.smtpUser as string | undefined;
    let smtpPass = org?.smtpPass as string | undefined;

    if (smtpPass && smtpPass.includes(':')) {
      try { smtpPass = decryptSmtpPass(smtpPass); } catch (err) { console.error('Failed to decrypt SMTP password:', err); }
    }

    if (smtpHost && smtpUser && smtpPass) {
      const smtpPort = (org?.smtpPort as number) || 587;

      if (org?.smtpFromEmail) {
        from = { email: org.smtpFromEmail as string, name: (org.smtpFromName as string) || from.name };
      }

      await sendViaSmtp(
        { email: options.to.email, name: options.to.name || from.name },
        from,
        options.subject,
        options.html,
        { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass }
      );
      return;
    }

    if (org?.smtpFromEmail) {
      from = { email: org.smtpFromEmail as string, name: (org.smtpFromName as string) || from.name };
    }
  }

  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    await sendViaSmtp(
      { email: options.to.email, name: options.to.name || from.name },
      from,
      options.subject,
      options.html
    );
    return;
  }

  console.warn('No email provider configured. Skipping email to', options.to.email);
}

export async function getOrgAdmins(orgId: string): Promise<EmailAddress[]> {
  const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
  if (!org) return [];

  const adminIds = org.adminIds as string[] | undefined;
  if (!adminIds || !Array.isArray(adminIds)) return [];

  const results = await Promise.all(
    adminIds.map((uid) =>
      readFirestoreDocument(COLLECTIONS.USERS, uid).then((user) => {
        if (!user?.email) return null;
        return { email: user.email as string, name: user.displayName as string | undefined };
      })
    )
  );
  return results.filter((r) => r !== null) as EmailAddress[];
}

export async function getUserEmail(userId: string): Promise<EmailAddress | null> {
  const user = await readFirestoreDocument(COLLECTIONS.USERS, userId);
  if (!user?.email) return null;
  return {
    email: user.email as string,
    name: user.displayName as string | undefined,
  };
}
