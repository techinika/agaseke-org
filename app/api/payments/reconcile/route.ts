import { NextResponse } from 'next/server';
import { queryFirestoreDocuments } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';
import { reconcilePendingTransaction } from '@/lib/payments';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingTxs = await queryFirestoreDocuments(
      COLLECTIONS.TRANSACTIONS,
      'status',
      'EQUAL',
      'pending'
    );

    const results = { checked: 0, completed: 0, failed: 0, skipped: 0, errors: 0 };

    for (const tx of pendingTxs) {
      const depositId = tx.depositId as string | undefined;
      if (!depositId) {
        results.skipped++;
        continue;
      }

      try {
        const result = await reconcilePendingTransaction(depositId);
        results.checked++;
        if (result === 'completed') results.completed++;
        else if (result === 'failed') results.failed++;
        else results.skipped++;
      } catch {
        results.errors++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reconciliation failed' },
      { status: 500 }
    );
  }
}
