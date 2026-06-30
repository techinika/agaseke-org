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
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  return handleCron(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleCron(request, 'POST');
}

async function handleCron(request: NextRequest, method: string): Promise<NextResponse> {
  const correlationId = `cron-rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logger.info('cron-reconcile', `Request received [${correlationId}] method=${method}`);

  try {
    if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
      logger.warn('cron-reconcile', `Unauthorized attempt [${correlationId}]`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.info('cron-reconcile', `Auth passed [${correlationId}]`);

    const pendingTxs = await queryFirestoreDocuments(
      COLLECTIONS.TRANSACTIONS,
      'status',
      'EQUAL',
      'pending'
    );
    logger.info('cron-reconcile', `Found ${pendingTxs.length} pending transactions [${correlationId}]`);

    const results = { checked: 0, completed: 0, failed: 0, skipped: 0, errors: 0 };
    const orgPendingMap = new Map<string, { count: number; totalAmount: number }>();

    for (const tx of pendingTxs) {
      const depositId = tx.depositId as string | undefined;
      if (!depositId) {
        logger.warn('cron-reconcile', `Transaction ${tx.id} has no depositId, skipping [${correlationId}]`);
        results.skipped++;
        continue;
      }

      try {
        const result = await reconcilePendingTransaction(depositId);
        results.checked++;
        logger.info('cron-reconcile', `Deposit ${depositId}: result=${result} [${correlationId}]`);
        if (result === 'completed') results.completed++;
        else if (result === 'failed') results.failed++;
        else {
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
      } catch (reconcileErr) {
        logger.error('cron-reconcile', `Reconcile error for deposit ${depositId} [${correlationId}]`, reconcileErr);
        results.errors++;
      }
    }

    if (hasEmailConfigured()) {
      logger.info('cron-reconcile', `Sending pending alerts for ${orgPendingMap.size} orgs [${correlationId}]`);
      const appUrl = getAppUrl();
      for (const [orgId, pending] of orgPendingMap) {
        try {
          const orgData = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId);
          if (!orgData) {
            logger.warn('cron-reconcile', `Org ${orgId} not found, skipping alert [${correlationId}]`);
            continue;
          }
          const admins = await getOrgAdmins(orgId);
          const brandColor = (orgData.brandColor as string) || '#FF0000';
          for (const admin of admins) {
            try {
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
            } catch (emailErr) {
              logger.error('cron-reconcile', `Failed to send alert email to admin [${correlationId}]`, emailErr);
            }
          }
        } catch (orgErr) {
          logger.error('cron-reconcile', `Failed to process org ${orgId} [${correlationId}]`, orgErr);
          results.errors++;
        }
      }
    } else {
      logger.info('cron-reconcile', `No email provider configured, skipping alerts [${correlationId}]`);
    }

    logger.info('cron-reconcile', `Complete [${correlationId}]: ${JSON.stringify(results)}`);
    return NextResponse.json(results);
  } catch (error) {
    logger.error('cron-reconcile', `Top-level error [${correlationId}]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reconciliation failed' },
      { status: 500 }
    );
  }
}

function hasEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST;
}
