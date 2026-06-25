import { emailLayout } from './layout';

export function paymentConfirmationTemplate(params: {
  recipientName: string;
  amount: string;
  currency: string;
  type: 'donation' | 'membership';
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  transactionId: string;
  date: string;
  description?: string;
}): string {
  const isDonation = params.type === 'donation';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #dcfce7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Payment ${isDonation ? 'Received' : 'Confirmed'}!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        Thank you for your ${isDonation ? 'donation to' : 'membership with'} ${params.orgName}
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Amount Paid</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${params.currency} ${params.amount}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Transaction ID</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; font-family: monospace; padding: 4px 0;">${params.transactionId}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Date</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.date}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Organization</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.orgName}</td>
            </tr>
            ${params.description ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">${isDonation ? 'Campaign' : 'Tier'}</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.description}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e4e4e7; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">
        ${isDonation
          ? 'Your contribution makes a real difference. Thank you for supporting our mission.'
          : 'Welcome to our community! You now have access to member-exclusive benefits.'
        }
      </p>
    </div>
  `;

  return emailLayout(content, {
    previewText: isDonation
      ? `Thank you for your donation of ${params.currency} ${params.amount} to ${params.orgName}`
      : `Your membership with ${params.orgName} is confirmed`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
  });
}
