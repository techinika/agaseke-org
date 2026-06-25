import nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

interface Address {
  email: string;
  name?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigKey = '';

function getConfigKey(config?: SmtpConfig): string {
  if (config) return `${config.host}:${config.port}:${config.user}`;
  return `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}:${process.env.SMTP_USER}`;
}

function createTransporter(config?: SmtpConfig): nodemailer.Transporter {
  const host = config?.host || process.env.SMTP_HOST || '';
  const port = config?.port || parseInt(process.env.SMTP_PORT || '587');
  const user = config?.user || process.env.SMTP_USER || '';
  const pass = config?.pass || process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getTransporter(config?: SmtpConfig): nodemailer.Transporter {
  const key = getConfigKey(config);
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;
  if (cachedTransporter) cachedTransporter.close();
  cachedTransporter = createTransporter(config);
  cachedConfigKey = key;
  return cachedTransporter;
}

export async function sendViaSmtp(
  to: Address,
  from: Address,
  subject: string,
  html: string,
  smtpConfig?: SmtpConfig
): Promise<void> {
  const host = smtpConfig?.host || process.env.SMTP_HOST;
  const user = smtpConfig?.user || process.env.SMTP_USER;
  const pass = smtpConfig?.pass || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }

  const transporter = getTransporter(smtpConfig);
  const toAddress = to.name ? `"${to.name}" <${to.email}>` : to.email;
  const fromAddress = from.name ? `"${from.name}" <${from.email}>` : from.email;

  await transporter.sendMail({
    to: toAddress,
    from: fromAddress,
    subject,
    html,
  });
}

export function closeSmtpTransporter(): void {
  if (cachedTransporter) {
    cachedTransporter.close();
    cachedTransporter = null;
    cachedConfigKey = '';
  }
}
