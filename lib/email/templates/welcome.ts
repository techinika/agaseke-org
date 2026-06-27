import { emailLayout, DEFAULT_BRAND_COLOR } from './layout';

export function welcomeTemplate(params: {
  recipientName: string;
  orgName?: string;
  orgLogoURL?: string;
  brandColor?: string;
  dashboardUrl?: string;
}): string {
  const brand = params.brandColor || DEFAULT_BRAND_COLOR;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #dcfce7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Welcome to Quorum!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        ${params.orgName ? `You're now part of ${params.orgName}` : "We're glad to have you"}
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
      Hi ${params.recipientName},
    </p>

    <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
      Welcome${params.orgName ? ` to ${params.orgName}` : ''}! You can now manage your membership, 
      make donations, and connect with the community through chat rooms.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.dashboardUrl || '#'}" style="display: inline-block; background-color: ${brand}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        Get Started
      </a>
    </div>

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">
        If you have any questions, feel free to reach out to the organization administrators.
      </p>
    </div>
  `;

  return emailLayout(content, {
    previewText: `Welcome to${params.orgName ? ` ${params.orgName}` : ' Quorum'}!`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
  });
}
