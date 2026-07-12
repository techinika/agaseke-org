import { emailLayout, DEFAULT_BRAND_COLOR } from './layout';

export function membershipExpiryTemplate(params: {
  recipientName: string;
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  tierName: string;
  expiredDate: string;
  renewalUrl: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  footerText?: string;
}): string {
  const brand = params.brandColor || DEFAULT_BRAND_COLOR;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #fee2e2; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Membership Expired
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        Your membership with ${params.orgName} has expired
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Membership Tier</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0; font-weight: 600;">${params.tierName}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Expired On</td>
              <td style="font-size: 13px; color: #ef4444; text-align: right; padding: 4px 0;">${params.expiredDate}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
      Your membership has expired and you've lost access to member-exclusive benefits and rooms. 
      Renew your membership to regain access.
    </p>

    <div style="text-align: center;">
      <a href="${params.renewalUrl}" style="display: inline-block; background-color: ${brand}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        Renew Membership
      </a>
    </div>
  `;

  return emailLayout(content, {
    previewText: `Your membership with ${params.orgName} has expired`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
    websiteUrl: params.websiteUrl,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    footerText: params.footerText,
  });
}
