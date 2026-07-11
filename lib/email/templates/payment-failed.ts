import { emailLayout, DEFAULT_BRAND_COLOR } from './layout';

export function paymentFailedTemplate(params: {
  recipientName: string;
  amount: string;
  currency: string;
  type: 'donation' | 'membership';
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  failureReason?: string;
  date: string;
  retryUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  footerText?: string;
}): string {
  const brand = params.brandColor || DEFAULT_BRAND_COLOR;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #fee2e2; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Payment Failed
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        Your ${params.type === 'donation' ? 'donation to' : 'membership payment for'} ${params.orgName} could not be processed
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Attempted Amount</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${params.currency} ${params.amount}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Date</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.date}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Organization</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.orgName}</td>
            </tr>
            ${params.failureReason ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Reason</td>
              <td style="font-size: 13px; color: #ef4444; text-align: right; padding: 4px 0;">${params.failureReason}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
      ${params.type === 'donation'
        ? 'Your donation could not be processed at this time. Please try again or use a different payment method.'
        : 'Your membership payment could not be processed. Please try again to maintain your membership benefits.'
      }
    </p>

    ${params.retryUrl ? `
    <div style="text-align: center;">
      <a href="${params.retryUrl}" style="display: inline-block; background-color: ${brand}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        Try Again
      </a>
    </div>
    ` : ''}
  `;

  return emailLayout(content, {
    previewText: `Payment failed: ${params.currency} ${params.amount} for ${params.orgName}`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
    websiteUrl: params.websiteUrl,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    footerText: params.footerText,
  });
}
