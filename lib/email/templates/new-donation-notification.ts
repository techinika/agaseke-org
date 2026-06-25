import { emailLayout, DEFAULT_BRAND_COLOR } from './layout';

export function newDonationNotificationTemplate(params: {
  adminName: string;
  donorName: string;
  donorEmail?: string;
  amount: string;
  currency: string;
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  campaignName?: string;
  donationDate: string;
  donationsUrl: string;
}): string {
  const brand = params.brandColor || DEFAULT_BRAND_COLOR;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #dbeafe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        New Donation Received!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        ${params.donorName} has made a donation to ${params.orgName}
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Donation Amount</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${params.currency} ${params.amount}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Donor</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0; font-weight: 600;">${params.donorName}</td>
            </tr>
            ${params.donorEmail ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Email</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.donorEmail}</td>
            </tr>
            ` : ''}
            ${params.campaignName ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Campaign</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.campaignName}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Date</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.donationDate}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="text-align: center;">
      <a href="${params.donationsUrl}" style="display: inline-block; background-color: ${brand}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        View Donations
      </a>
    </div>
  `;

  return emailLayout(content, {
    previewText: `New donation of ${params.currency} ${params.amount} from ${params.donorName}`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
  });
}
