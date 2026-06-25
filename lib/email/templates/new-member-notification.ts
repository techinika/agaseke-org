import { emailLayout, DEFAULT_BRAND_COLOR } from './layout';

export function newMemberNotificationTemplate(params: {
  adminName: string;
  memberName: string;
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  tierName: string;
  joinedDate: string;
  memberEmail?: string;
  membersUrl: string;
}): string {
  const brand = params.brandColor || DEFAULT_BRAND_COLOR;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #dbeafe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        New Member Joined!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        ${params.memberName} has joined ${params.orgName}
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Name</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0; font-weight: 600;">${params.memberName}</td>
            </tr>
            ${params.memberEmail ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Email</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.memberEmail}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Tier</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.tierName}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Joined</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${params.joinedDate}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="text-align: center;">
      <a href="${params.membersUrl}" style="display: inline-block; background-color: ${brand}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        View Member
      </a>
    </div>
  `;

  return emailLayout(content, {
    previewText: `New member joined ${params.orgName}: ${params.memberName}`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
  });
}
