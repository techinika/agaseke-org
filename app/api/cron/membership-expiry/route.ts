import { NextRequest, NextResponse } from 'next/server';
import {
  queryFirestoreDocuments,
  updateFirestoreDocument,
  readFirestoreDocument,
} from '@/lib/firebase/server';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { sendEmail, getUserEmail } from '@/lib/email';
import { membershipExpiryTemplate } from '@/lib/email/templates/membership-expiry';
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
  const correlationId = `cron-exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logger.info('cron-membership-expiry', `Request received [${correlationId}] method=${method}`);

  try {
    if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
      logger.warn('cron-membership-expiry', `Unauthorized attempt [${correlationId}]`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.info('cron-membership-expiry', `Auth passed [${correlationId}]`);

    const results = { expired: 0, notified: 0, errors: 0 };
    const appUrl = getAppUrl();

    const memberships = await queryFirestoreDocuments(
      COLLECTIONS.MEMBERSHIPS,
      'status',
      'EQUAL',
      'active'
    );
    logger.info('cron-membership-expiry', `Found ${memberships.length} active memberships [${correlationId}]`);

    for (const membership of memberships) {
      try {
        const renewsAt = membership.renewsAt as string | undefined;
        if (!renewsAt || renewsAt === 'null') {
          logger.debug('cron-membership-expiry', `Membership ${membership.id}: no renewsAt (one-time), skipping [${correlationId}]`);
          continue;
        }

        const renewsAtTime = new Date(renewsAt).getTime();
        if (renewsAtTime > Date.now()) {
          logger.debug('cron-membership-expiry', `Membership ${membership.id}: not expired yet (${renewsAt}) [${correlationId}]`);
          continue;
        }

        const membershipId = membership.id;
        const userId = membership.userId as string;
        const orgId = membership.orgId as string;
        const tierId = membership.tierId as string;

        logger.info('cron-membership-expiry', `Expiring membership ${membershipId} for user ${userId} in org ${orgId} [${correlationId}]`);

        await updateFirestoreDocument(COLLECTIONS.MEMBERSHIPS, membershipId, { status: 'expired' });

        if (orgId && userId) {
          await updateFirestoreDocument(
            COLLECTIONS.ORGANIZATIONS,
            orgId,
            { status: 'expired' },
            SUBCOLLECTIONS.MEMBERS,
            userId
          );
        }

        results.expired++;

        const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
        if (!org) {
          logger.warn('cron-membership-expiry', `Org ${orgId} not found for expired membership ${membershipId} [${correlationId}]`);
          continue;
        }

        const tier = await readFirestoreDocument(
          COLLECTIONS.ORGANIZATIONS,
          orgId,
          SUBCOLLECTIONS.TIERS,
          tierId
        );
        const tierName = (tier?.name as string) || 'Member';

        const user = await getUserEmail(userId);
        if (!user) {
          logger.warn('cron-membership-expiry', `User ${userId} not found for expiry notification [${correlationId}]`);
          continue;
        }

        const slug = org.slug as string;
        const brandColor = (org.brandColor as string) || '#FF0000';

        try {
          await sendEmail(
            {
              to: user,
              subject: `Membership Expired — ${org.name as string}`,
              html: membershipExpiryTemplate({
                recipientName: user.name || 'Member',
                orgName: org.name as string,
                orgLogoURL: org.logoURL as string | undefined,
                brandColor,
                tierName,
                expiredDate: new Date(renewsAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                }),
                renewalUrl: `${appUrl}/org/${slug}/join`,
              }),
            },
            orgId
          );
          results.notified++;
          logger.info('cron-membership-expiry', `Sent expiry notification for membership ${membershipId} [${correlationId}]`);
        } catch (emailErr) {
          logger.error('cron-membership-expiry', `Failed to send expiry email for membership ${membershipId} [${correlationId}]`, emailErr);
        }
      } catch (memErr) {
        logger.error('cron-membership-expiry', `Error processing membership ${membership.id} [${correlationId}]`, memErr);
        results.errors++;
      }
    }

    logger.info('cron-membership-expiry', `Complete [${correlationId}]: ${JSON.stringify(results)}`);
    return NextResponse.json(results);
  } catch (error) {
    logger.error('cron-membership-expiry', `Top-level error [${correlationId}]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Membership expiry processing failed' },
      { status: 500 }
    );
  }
}
