import { emailLayout } from './layout';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  footerText?: string;
}): string {
  const isDonation = params.type === 'donation';
  const orgName = escapeHtml(params.orgName);
  const recipientName = escapeHtml(params.recipientName);
  const description = params.description ? escapeHtml(params.description) : undefined;
  const transactionId = escapeHtml(params.transactionId);

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #dcfce7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Payment ${isDonation ? 'Received' : 'Confirmed'}!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        Thank you for your ${isDonation ? 'donation to' : 'membership with'} ${orgName}
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Amount Paid</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${escapeHtml(params.currency)} ${escapeHtml(params.amount)}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Transaction ID</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; font-family: monospace; padding: 4px 0;">${transactionId}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Date</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${escapeHtml(params.date)}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Organization</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${orgName}</td>
            </tr>
            ${description ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">${isDonation ? 'Campaign' : 'Tier'}</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${description}</td>
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
    websiteUrl: params.websiteUrl,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    footerText: params.footerText,
  });
}

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
  const brand = params.brandColor || '#FF0000';
  const orgName = escapeHtml(params.orgName);
  const failureReason = params.failureReason ? escapeHtml(params.failureReason) : undefined;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #fee2e2; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Payment Failed
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        Your ${params.type === 'donation' ? 'donation to' : 'membership payment for'} ${orgName} could not be processed
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Attempted Amount</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${escapeHtml(params.currency)} ${escapeHtml(params.amount)}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Date</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${escapeHtml(params.date)}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Organization</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${orgName}</td>
            </tr>
            ${failureReason ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Reason</td>
              <td style="font-size: 13px; color: #ef4444; text-align: right; padding: 4px 0;">${failureReason}</td>
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

export function paymentReminderTemplate(params: {
  recipientName: string;
  amount: string;
  currency: string;
  type: 'donation' | 'membership';
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  renewalDate: string;
  renewUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  footerText?: string;
}): string {
  const brand = params.brandColor || '#FF0000';
  const orgName = escapeHtml(params.orgName);

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #fef3c7; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        Renewal Reminder
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        Your ${params.type === 'donation' ? 'recurring donation' : 'membership'} with ${orgName} renews soon
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Renewal Amount</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${escapeHtml(params.currency)} ${escapeHtml(params.amount)}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Renewal Date</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${escapeHtml(params.renewalDate)}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Organization</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${orgName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.6;">
      Your ${params.type} is set to renew automatically. Ensure your payment method is up to date to avoid interruption.
    </p>

    ${params.renewUrl ? `
    <div style="text-align: center;">
      <a href="${params.renewUrl}" style="display: inline-block; background-color: ${brand}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        Renew Now
      </a>
    </div>
    ` : ''}
  `;

  return emailLayout(content, {
    previewText: `Renewal reminder: ${params.currency} ${params.amount} for ${params.orgName}`,
    orgName: params.orgName,
    orgLogoURL: params.orgLogoURL,
    brandColor: params.brandColor,
    websiteUrl: params.websiteUrl,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    footerText: params.footerText,
  });
}

export function newDonationNotificationTemplate(params: {
  adminName: string;
  donorName: string;
  donorEmail?: string;
  amount: string;
  currency: string;
  orgName: string;
  orgLogoURL?: string;
  brandColor?: string;
  donationDate: string;
  donationsUrl: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  footerText?: string;
}): string {
  const brand = params.brandColor || '#FF0000';
  const orgName = escapeHtml(params.orgName);
  const donorName = escapeHtml(params.donorName);
  const donorEmail = params.donorEmail ? escapeHtml(params.donorEmail) : undefined;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #dbeafe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        New Donation Received!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        ${donorName} has made a donation to ${orgName}
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Donation Amount</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #18181b;">${escapeHtml(params.currency)} ${escapeHtml(params.amount)}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Donor</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0; font-weight: 600;">${donorName}</td>
            </tr>
            ${donorEmail ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Email</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${donorEmail}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Date</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${escapeHtml(params.donationDate)}</td>
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
    websiteUrl: params.websiteUrl,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    footerText: params.footerText,
  });
}

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
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  footerText?: string;
}): string {
  const brand = params.brandColor || '#FF0000';
  const orgName = escapeHtml(params.orgName);
  const memberName = escapeHtml(params.memberName);
  const tierName = escapeHtml(params.tierName);
  const memberEmail = params.memberEmail ? escapeHtml(params.memberEmail) : undefined;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background-color: #dbeafe; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #18181b;">
        New Member Joined!
      </h1>
      <p style="margin: 0; font-size: 14px; color: #71717a;">
        ${memberName} has joined ${orgName}
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background-color: #f4f4f5; border-radius: 8px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Name</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0; font-weight: 600;">${memberName}</td>
            </tr>
            ${memberEmail ? `
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Email</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${memberEmail}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Tier</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${tierName}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #71717a; padding: 4px 0;">Joined</td>
              <td style="font-size: 13px; color: #18181b; text-align: right; padding: 4px 0;">${escapeHtml(params.joinedDate)}</td>
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
    websiteUrl: params.websiteUrl,
    contactEmail: params.contactEmail,
    contactPhone: params.contactPhone,
    footerText: params.footerText,
  });
}
