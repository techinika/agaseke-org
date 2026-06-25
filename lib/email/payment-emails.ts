import { readFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { sendEmail, getUserEmail, getOrgAdmins } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';
import { paymentConfirmationTemplate } from '@/lib/email/templates/payment-confirmation';
import { paymentFailedTemplate } from '@/lib/email/templates/payment-failed';
import { newDonationNotificationTemplate } from '@/lib/email/templates/new-donation-notification';
import { newMemberNotificationTemplate } from '@/lib/email/templates/new-member-notification';

export async function sendDonationEmails(donation: Record<string, unknown>, orgId?: string): Promise<void> {
  if (!orgId) return;
  try {
    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
    if (!org) return;

    const donorEmail = donation.donorEmail as string | undefined;
    const appUrl = getAppUrl();
    const brandColor = (org.brandColor as string) || '#FF0000';

    if (donorEmail) {
      await sendEmail(
        {
          to: { email: donorEmail, name: (donation.donorName as string) || undefined },
          subject: `Donation Receipt — ${org.name as string}`,
          html: paymentConfirmationTemplate({
            recipientName: (donation.donorName as string) || 'Supporter',
            amount: (donation.amount as number).toFixed(2),
            currency: 'USD',
            type: 'donation',
            orgName: org.name as string,
            orgLogoURL: org.logoURL as string | undefined,
            brandColor,
            transactionId: (donation.id as string) || '',
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
          }),
        },
        orgId
      );
    }

    const admins = await getOrgAdmins(orgId);
    for (const admin of admins) {
      if (admin.email === donorEmail) continue;
      await sendEmail(
        {
          to: admin,
          subject: `New Donation — ${org.name as string}`,
          html: newDonationNotificationTemplate({
            adminName: admin.name || 'Admin',
            donorName: (donation.donorName as string) || 'Anonymous',
            donorEmail: donorEmail || undefined,
            amount: (donation.amount as number).toFixed(2),
            currency: 'USD',
            orgName: org.name as string,
            orgLogoURL: org.logoURL as string | undefined,
            brandColor,
            donationDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
            donationsUrl: `${appUrl}/org/${org.slug as string}/donations`,
          }),
        },
        orgId
      );
    }
  } catch (error) {
    console.error('Failed to send donation emails:', error);
  }
}

export async function sendMembershipEmails(membership: Record<string, unknown>): Promise<void> {
  try {
    const orgId = membership.orgId as string;
    const userId = membership.userId as string;
    const tierId = membership.tierId as string;

    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
    if (!org) return;

    const user = await getUserEmail(userId);
    if (!user) return;

    const tier = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId, SUBCOLLECTIONS.TIERS, tierId);
    const tierName = (tier?.name as string) || 'Member';
    const appUrl = getAppUrl();
    const brandColor = (org.brandColor as string) || '#FF0000';

    await sendEmail(
      {
        to: user,
        subject: `Welcome to ${org.name as string}!`,
        html: paymentConfirmationTemplate({
          recipientName: user.name || 'Member',
          amount: (membership.amount as number)?.toFixed(2) || '0.00',
          currency: 'USD',
          type: 'membership',
          orgName: org.name as string,
          orgLogoURL: org.logoURL as string | undefined,
          brandColor,
          transactionId: (membership.id as string) || '',
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          }),
          description: tierName,
        }),
      },
      orgId
    );

    const memberDoc = await readFirestoreDocument(
      COLLECTIONS.ORGANIZATIONS, orgId, SUBCOLLECTIONS.MEMBERS, userId
    );

    const admins = await getOrgAdmins(orgId);
    for (const admin of admins) {
      if (admin.email === user.email) continue;
      await sendEmail(
        {
          to: admin,
          subject: `New Member — ${org.name as string}`,
          html: newMemberNotificationTemplate({
            adminName: admin.name || 'Admin',
            memberName: user.name || (memberDoc?.displayName as string) || 'New Member',
            memberEmail: user.email,
            orgName: org.name as string,
            orgLogoURL: org.logoURL as string | undefined,
            brandColor,
            tierName,
            joinedDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
            membersUrl: `${appUrl}/org/${org.slug as string}/members`,
          }),
        },
        orgId
      );
    }
  } catch (error) {
    console.error('Failed to send membership emails:', error);
  }
}

export async function sendDonationFailedEmails(
  donation: Record<string, unknown>,
  orgId?: string,
  failureReason?: string
): Promise<void> {
  if (!orgId) return;
  try {
    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
    if (!org) return;

    const donorEmail = donation.donorEmail as string | undefined;
    const appUrl = getAppUrl();
    const brandColor = (org.brandColor as string) || '#FF0000';

    if (donorEmail) {
      await sendEmail(
        {
          to: { email: donorEmail, name: (donation.donorName as string) || undefined },
          subject: `Payment Failed — ${org.name as string}`,
          html: paymentFailedTemplate({
            recipientName: (donation.donorName as string) || 'Supporter',
            amount: (donation.amount as number).toFixed(2),
            currency: 'USD',
            type: 'donation',
            orgName: org.name as string,
            orgLogoURL: org.logoURL as string | undefined,
            brandColor,
            failureReason,
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
            retryUrl: `${appUrl}/org/${org.slug as string}/donate`,
          }),
        },
        orgId
      );
    }

    const admins = await getOrgAdmins(orgId);
    for (const admin of admins) {
      if (admin.email === donorEmail) continue;
      await sendEmail(
        {
          to: admin,
          subject: `Failed Donation — ${org.name as string}`,
          html: newDonationNotificationTemplate({
            adminName: admin.name || 'Admin',
            donorName: (donation.donorName as string) || 'Anonymous',
            donorEmail: donorEmail || undefined,
            amount: (donation.amount as number).toFixed(2),
            currency: 'USD',
            orgName: org.name as string,
            orgLogoURL: org.logoURL as string | undefined,
            brandColor,
            donationDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
            donationsUrl: `${appUrl}/org/${org.slug as string}/donations`,
          }),
        },
        orgId
      );
    }
  } catch (error) {
    console.error('Failed to send failed donation emails:', error);
  }
}

export async function sendMembershipFailedEmails(
  membership: Record<string, unknown>,
  failureReason?: string
): Promise<void> {
  try {
    const orgId = membership.orgId as string;
    const userId = membership.userId as string;
    const tierId = membership.tierId as string;

    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
    if (!org) return;

    const user = await getUserEmail(userId);
    if (!user) return;

    const tier = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId, SUBCOLLECTIONS.TIERS, tierId);
    const tierName = (tier?.name as string) || 'Member';
    const appUrl = getAppUrl();
    const brandColor = (org.brandColor as string) || '#FF0000';

    await sendEmail(
      {
        to: user,
        subject: `Membership Payment Failed — ${org.name as string}`,
        html: paymentFailedTemplate({
          recipientName: user.name || 'Member',
          amount: (membership.amount as number)?.toFixed(2) || '0.00',
          currency: 'USD',
          type: 'membership',
          orgName: org.name as string,
          orgLogoURL: org.logoURL as string | undefined,
          brandColor,
          failureReason,
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          }),
          retryUrl: `${appUrl}/org/${org.slug as string}/join`,
        }),
      },
      orgId
    );

    const admins = await getOrgAdmins(orgId);
    for (const admin of admins) {
      if (admin.email === user.email) continue;
      await sendEmail(
        {
          to: admin,
          subject: `Failed Membership — ${org.name as string}`,
          html: newMemberNotificationTemplate({
            adminName: admin.name || 'Admin',
            memberName: user.name || 'New Member',
            memberEmail: user.email,
            orgName: org.name as string,
            orgLogoURL: org.logoURL as string | undefined,
            brandColor,
            tierName,
            joinedDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
            membersUrl: `${appUrl}/org/${org.slug as string}/members`,
          }),
        },
        orgId
      );
    }
  } catch (error) {
    console.error('Failed to send failed membership emails:', error);
  }
}
