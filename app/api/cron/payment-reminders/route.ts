import { NextRequest, NextResponse } from 'next/server';
import {
  queryFirestoreDocuments,
  readFirestoreDocument,
  updateFirestoreDocument,
} from '@/lib/firebase/server';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { sendEmail, getUserEmail } from '@/lib/email';
import { paymentReminderTemplate } from '@/lib/email/templates/payment-reminder';
import { getAppUrl } from '@/lib/app-url';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest): Promise<NextResponse> {
  try {
    if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = { remindersSent: 0, membershipsChecked: 0, donationsChecked: 0, errors: 0, skippedDuplicates: 0 };
    const appUrl = getAppUrl();

    const now = Date.now();
    const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;
    const today = new Date().toISOString().slice(0, 10);

    const memberships = await queryFirestoreDocuments(
      COLLECTIONS.MEMBERSHIPS,
      'status',
      'EQUAL',
      'active'
    );

    for (const membership of memberships) {
      results.membershipsChecked++;
      try {
        const renewsAt = membership.renewsAt as string | undefined;
        if (!renewsAt) continue;

        const lastReminderDate = membership.lastReminderDate as string | undefined;
        if (lastReminderDate === today) {
          results.skippedDuplicates++;
          continue;
        }

        const renewsAtTime = new Date(renewsAt).getTime();
        if (renewsAtTime > threeDaysFromNow || renewsAtTime <= now) continue;

        const userId = membership.userId as string;
        const orgId = membership.orgId as string;
        const membershipId = (membership as any).id as string;
        const tierId = membership.tierId as string;

        const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
        if (!org) continue;

        const tier = await readFirestoreDocument(
          COLLECTIONS.ORGANIZATIONS,
          orgId,
          SUBCOLLECTIONS.TIERS,
          tierId
        );
        const tierName = (tier?.name as string) || 'Member';
        const tierPrice = (tier?.price as number) || 0;

        const user = await getUserEmail(userId);
        if (!user) continue;

        const slug = org.slug as string;
        const brandColor = (org.brandColor as string) || '#FF0000';

        await sendEmail(
          {
            to: user,
            subject: `Membership Renewal Reminder — ${org.name as string}`,
            html: paymentReminderTemplate({
              recipientName: user.name || 'Member',
              amount: tierPrice.toFixed(2),
              currency: 'USD',
              orgName: org.name as string,
              orgLogoURL: org.logoURL as string | undefined,
              brandColor,
              dueDate: new Date(renewsAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              type: 'membership',
              description: tierName,
              paymentUrl: `${appUrl}/org/${slug}/join`,
            }),
          },
          orgId
        );

        await updateFirestoreDocument(COLLECTIONS.MEMBERSHIPS, membershipId, {
          lastReminderDate: today,
        });

        results.remindersSent++;
      } catch {
        results.errors++;
      }
    }

    const donations = await queryFirestoreDocuments(
      COLLECTIONS.DONATIONS,
      'status',
      'EQUAL',
      'active'
    );

    for (const donation of donations) {
      results.donationsChecked++;
      try {
        const frequency = donation.frequency as string | undefined;
        if (frequency === 'one_time') continue;

        const nextBillingDate = donation.nextBillingDate as string | undefined;
        if (!nextBillingDate) continue;

        const donationId = (donation as any).id as string;
        const lastReminderDate = donation.lastReminderDate as string | undefined;
        if (lastReminderDate === today) {
          results.skippedDuplicates++;
          continue;
        }

        const billingTime = new Date(nextBillingDate).getTime();
        if (billingTime > threeDaysFromNow || billingTime <= now) continue;

        const orgId = donation.orgId as string;
        const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
        if (!org) continue;

        const donorEmail = donation.donorEmail as string | undefined;
        if (!donorEmail) continue;

        const slug = org.slug as string;
        const brandColor = (org.brandColor as string) || '#FF0000';

        let campaignName: string | undefined;
        const campaignId = donation.campaignId as string | undefined;
        if (campaignId) {
          const campaign = await readFirestoreDocument(
            COLLECTIONS.ORGANIZATIONS,
            orgId,
            SUBCOLLECTIONS.CAMPAIGNS,
            campaignId
          );
          campaignName = campaign?.name as string | undefined;
        }

        await sendEmail(
          {
            to: { email: donorEmail, name: (donation.donorName as string) || undefined },
            subject: `Donation Reminder — ${org.name as string}`,
            html: paymentReminderTemplate({
              recipientName: (donation.donorName as string) || 'Supporter',
              amount: (donation.amount as number).toFixed(2),
              currency: 'USD',
              orgName: org.name as string,
              orgLogoURL: org.logoURL as string | undefined,
              brandColor,
              dueDate: new Date(nextBillingDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              type: 'donation',
              description: campaignName,
              paymentUrl: `${appUrl}/org/${slug}/donate`,
            }),
          },
          orgId
        );

        await updateFirestoreDocument(COLLECTIONS.DONATIONS, donationId, {
          lastReminderDate: today,
        });

        results.remindersSent++;
      } catch {
        results.errors++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Cron payment reminders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment reminders failed' },
      { status: 500 }
    );
  }
}
