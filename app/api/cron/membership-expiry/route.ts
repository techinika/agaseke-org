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

    const results = { expired: 0, notified: 0, errors: 0 };
    const appUrl = getAppUrl();

    const memberships = await queryFirestoreDocuments(
      COLLECTIONS.MEMBERSHIPS,
      'status',
      'EQUAL',
      'active'
    );

    for (const membership of memberships) {
      try {
        const renewsAt = membership.renewsAt as string | undefined;
        if (!renewsAt || renewsAt === 'null') continue; // one-time memberships never expire

        const renewsAtTime = new Date(renewsAt).getTime();
        if (renewsAtTime > Date.now()) continue;

        const membershipId = membership.id;
        const userId = membership.userId as string;
        const orgId = membership.orgId as string;
        const tierId = membership.tierId as string;

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
        if (!org) continue;

        const tier = await readFirestoreDocument(
          COLLECTIONS.ORGANIZATIONS,
          orgId,
          SUBCOLLECTIONS.TIERS,
          tierId
        );
        const tierName = (tier?.name as string) || 'Member';

        const user = await getUserEmail(userId);
        if (!user) continue;

        const slug = org.slug as string;
        const brandColor = (org.brandColor as string) || '#FF0000';

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
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              renewalUrl: `${appUrl}/org/${slug}/join`,
            }),
          },
          orgId
        );

        results.notified++;
      } catch {
        results.errors++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Cron membership expiry error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Membership expiry processing failed' },
      { status: 500 }
    );
  }
}
