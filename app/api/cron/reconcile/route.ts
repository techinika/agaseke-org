import { NextRequest, NextResponse } from 'next/server';
import {
  queryFirestoreDocuments,
  readFirestoreDocument,
} from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';
import { sendEmail, getOrgAdmins } from '@/lib/email';
import { pendingTransactionAlertTemplate } from '@/lib/email/templates/pending-transaction-alert';
import { reconcilePendingTransaction } from '@/lib/payments';
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

    const pendingTxs = await queryFirestoreDocuments(
      COLLECTIONS.TRANSACTIONS,
      'status',
      'EQUAL',
      'pending'
    );

    const results = { checked: 0, completed: 0, failed: 0, skipped: 0, errors: 0 };
    const orgPendingMap = new Map<string, { count: number; totalAmount: number }>();

    for (const tx of pendingTxs) {
      const depositId = tx.depositId as string | undefined;
      if (!depositId) {
        results.skipped++;
        continue;
      }

      try {
        const result = await reconcilePendingTransaction(depositId);
        results.checked++;
        if (result === 'completed') {
          results.completed++;
        } else if (result === 'failed') {
          results.failed++;
        } else {
          const orgId = tx.orgId as string | undefined;
          if (orgId) {
            const prev = orgPendingMap.get(orgId) || { count: 0, totalAmount: 0 };
            orgPendingMap.set(orgId, {
              count: prev.count + 1,
              totalAmount: prev.totalAmount + ((tx.amount as number) || 0),
            });
          }
          results.skipped++;
        }
      } catch {
        results.errors++;
      }
    }

    if (hasEmailConfigured()) {
      const appUrl = getAppUrl();
      for (const [orgId, pending] of orgPendingMap) {
        try {
          const orgData = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
          if (!orgData) continue;

          const admins = await getOrgAdmins(orgId);
          const brandColor = (orgData.brandColor as string) || '#FF0000';

          for (const admin of admins) {
            await sendEmail(
              {
                to: admin,
                subject: `Pending Transactions — ${orgData.name as string}`,
                html: pendingTransactionAlertTemplate({
                  adminName: admin.name || 'Admin',
                  orgName: orgData.name as string,
                  pendingCount: pending.count,
                  totalAmount: pending.totalAmount.toFixed(2),
                  currency: 'USD',
                  brandColor,
                  reconcileUrl: `${appUrl}/org/${orgData.slug as string}/finance`,
                }),
              },
              orgId
            );
          }
        } catch {
          results.errors++;
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Cron reconciliation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reconciliation failed' },
      { status: 500 }
    );
  }
}

function hasEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST;
}
