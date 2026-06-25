import { emailLayout, DEFAULT_BRAND_COLOR } from './layout';

export function paymentReminderTemplate(params: {
  recipientName: string;
  amount: string;
  currency: string;
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  dueDate: string;
  type: 'donation' | 'membership';
  description?: string;
  paymentUrl: string;
}): string {
  const brand = params.brandColor || DEFAULT_BRAND_COLOR;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #fef3c7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Payment Reminder
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        Your upcoming ${params.type === 'membership' ? 'membership payment' : 'recurring donation'} is due soon
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Amount Due</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${params.currency} ${params.amount}</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #d97706;">Due: ${params.dueDate}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Organization</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.orgName}</td>
            </tr>
            ${params.description ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">${params.type === 'membership' ? 'Tier' : 'Campaign'}</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.description}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <div style="text-align: center;">
      <a href="${params.paymentUrl}" style="display: inline-block; background-color: ${brand}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        Make Payment Now
      </a>
      <p style="margin: 12px 0 0; font-size: 12px; color: #71717a;">
        If you've already made this payment, please ignore this reminder.
      </p>
    </div>
  `;

  return emailLayout(content, {
    previewText: `Reminder: ${params.currency} ${params.amount} payment due for ${params.orgName}`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
  });
}
