import { Resend } from 'resend';

interface Address {
  email: string;
  name?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export function isResendConfigured(): boolean {
  return !!resend;
}

export async function sendViaResend(
  to: Address,
  from: Address,
  subject: string,
  html: string
): Promise<void> {
  if (!resend) throw new Error('Resend API key not configured');

  const { error } = await resend.emails.send({
    from: from.name ? `${from.name} <${from.email}>` : from.email,
    to: to.name ? `${to.name} <${to.email}>` : to.email,
    subject,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
