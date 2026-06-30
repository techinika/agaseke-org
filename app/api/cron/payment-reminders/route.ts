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
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  return handleCron(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleCron(request, 'POST');
}

async function handleCron(request: NextRequest, method: string): Promise<NextResponse> {
  const correlationId = `cron-rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logger.info('cron-payment-reminders', `Request received [${correlationId}] method=${method}`);

  try {
    if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
      logger.warn('cron-payment-reminders', `Unauthorized attempt [${correlationId}]`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.info('cron-payment-reminders', `Auth passed [${correlationId}]`);

    const results = { remindersSent: 0, membershipsChecked: 0, donationsChecked: 0, errors: 0, skippedDuplicates: 0 };
    const appUrl = getAppUrl();
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;

    logger.info('cron-payment-reminders', `Processing memberships [${correlationId}] today=${today}`);
    const memberships = await queryFirestoreDocuments(
      COLLECTIONS.MEMBERSHIPS,
      'status',
      'EQUAL',
      'active'
    );
    logger.info('cron-payment-reminders', `Found ${memberships.length} active memberships [${correlationId}]`);

    for (const membership of memberships) {
      results.membershipsChecked++;
      try {
        const renewsAt = membership.renewsAt as string | undefined;
        if (!renewsAt || renewsAt === 'null') {
          logger.debug('cron-payment-reminders', `Membership ${membership.id}: no renewsAt, skipping [${correlationId}]`);
          continue;
        }

        const lastReminderDate = membership.lastReminderDate as string | undefined;
        if (lastReminderDate === today) {
          results.skippedDuplicates++;
          logger.debug('cron-payment-reminders', `Membership ${membership.id}: already reminded today [${correlationId}]`);
          continue;
        }

        const renewsAtTime = new Date(renewsAt).getTime();
        if (renewsAtTime > threeDaysFromNow || renewsAtTime <= now) {
          logger.debug('cron-payment-reminders', `Membership ${membership.id}: renewsAt ${renewsAt} outside window [${correlationId}]`);
          continue;
        }

        const userId = membership.userId as string;
        const orgId = membership.orgId as string;
        const membershipId = membership.id as string;
        const tierId = membership.tierId as string;

        const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
        if (!org) {
          logger.warn('cron-payment-reminders', `Membership ${membershipId}: org ${orgId} not found [${correlationId}]`);
          continue;
        }

        const tier = await readFirestoreDocument(
          COLLECTIONS.ORGANIZATIONS,
          orgId,
          SUBCOLLECTIONS.TIERS,
          tierId
        );
        const tierName = (tier?.name as string) || 'Member';
        const tierPrice = (tier?.price as number) || 0;

        const user = await getUserEmail(userId);
        if (!user) {
          logger.warn('cron-payment-reminders', `Membership ${membershipId}: user ${userId} not found [${correlationId}]`);
          continue;
        }

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
                year: 'numeric', month: 'long', day: 'numeric',
              }),
              type: 'membership',
              description: tierName,
              paymentUrl: `${appUrl}/org/${slug}/join`,
            }),
          },
          orgId
        );

        await updateFirestoreDocument(COLLECTIONS.MEMBERSHIPS, membershipId, { lastReminderDate: today });
        results.remindersSent++;
        logger.info('cron-payment-reminders', `Sent membership reminder ${membershipId} [${correlationId}]`);
      } catch (memErr) {
        logger.error('cron-payment-reminders', `Error processing membership ${membership.id} [${correlationId}]`, memErr);
        results.errors++;
      }
    }

    logger.info('cron-payment-reminders', `Processing donations [${correlationId}]`);
    const donations = await queryFirestoreDocuments(
      COLLECTIONS.DONATIONS,
      'status',
      'EQUAL',
      'active'
    );
    logger.info('cron-payment-reminders', `Found ${donations.length} active donations [${correlationId}]`);

    for (const donation of donations) {
      results.donationsChecked++;
      try {
        const frequency = donation.frequency as string | undefined;
        if (frequency === 'one_time') {
          logger.debug('cron-payment-reminders', `Donation ${donation.id}: one_time, skipping [${correlationId}]`);
          continue;
        }

        const nextBillingDate = donation.nextBillingDate as string | undefined;
        if (!nextBillingDate) {
          logger.debug('cron-payment-reminders', `Donation ${donation.id}: no nextBillingDate, skipping [${correlationId}]`);
          continue;
        }

        const lastReminderDate = donation.lastReminderDate as string | undefined;
        if (lastReminderDate === today) {
          results.skippedDuplicates++;
          logger.debug('cron-payment-reminders', `Donation ${donation.id}: already reminded today [${correlationId}]`);
          continue;
        }

        const billingTime = new Date(nextBillingDate).getTime();
        if (billingTime > threeDaysFromNow || billingTime <= now) {
          logger.debug('cron-payment-reminders', `Donation ${donation.id}: nextBillingDate ${nextBillingDate} outside window [${correlationId}]`);
          continue;
        }

        const orgId = donation.orgId as string;
        const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
        if (!org) {
          logger.warn('cron-payment-reminders', `Donation ${donation.id}: org ${orgId} not found [${correlationId}]`);
          continue;
        }

        const donorEmail = donation.donorEmail as string | undefined;
        if (!donorEmail) {
          logger.warn('cron-payment-reminders', `Donation ${donation.id}: no donorEmail [${correlationId}]`);
          continue;
        }

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
                year: 'numeric', month: 'long', day: 'numeric',
              }),
              type: 'donation',
              description: campaignName,
              paymentUrl: `${appUrl}/org/${slug}/donate`,
            }),
          },
          orgId
        );

        await updateFirestoreDocument(COLLECTIONS.DONATIONS, donation.id, { lastReminderDate: today });
        results.remindersSent++;
        logger.info('cron-payment-reminders', `Sent donation reminder ${donation.id} [${correlationId}]`);
      } catch (donErr) {
        logger.error('cron-payment-reminders', `Error processing donation ${donation.id} [${correlationId}]`, donErr);
        results.errors++;
      }
    }

    logger.info('cron-payment-reminders', `Complete [${correlationId}]: ${JSON.stringify(results)}`);
    return NextResponse.json(results);
  } catch (error) {
    logger.error('cron-payment-reminders', `Top-level error [${correlationId}]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment reminders failed' },
      { status: 500 }
    );
  }
}
