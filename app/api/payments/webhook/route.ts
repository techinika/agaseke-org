import { NextRequest, NextResponse } from 'next/server';
import { checkDepositStatus } from '@/lib/pawapay';
import {
  queryFirestoreDocuments,
  updateFirestoreDocument,
  incrementFirestoreField,
} from '@/lib/firebase/server';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const depositId: string | undefined = body.depositId;

    if (!depositId) {
      return NextResponse.json({ error: 'Missing depositId' }, { status: 400 });
    }

    const result = await checkDepositStatus(depositId);

    if (result.status === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    const deposit = result.data!;

    if (deposit.status === 'COMPLETED') {
      await finalizeCompletedDeposit(depositId);
      return NextResponse.json({ status: 'completed' });
    }

    if (deposit.status === 'FAILED') {
      await finalizeFailedDeposit(depositId);
      return NextResponse.json({ status: 'failed' });
    }

    return NextResponse.json({ status: deposit.status, message: 'Not a final status, no action taken' });
  } catch (error) {
    console.error('pawaPay webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function finalizeCompletedDeposit(depositId: string): Promise<void> {
  const txs = await queryFirestoreDocuments(
    COLLECTIONS.TRANSACTIONS,
    'depositId',
    'EQUAL',
    depositId
  );

  for (const tx of txs) {
    if (tx.status === 'completed') continue;

    await updateFirestoreDocument(COLLECTIONS.TRANSACTIONS, tx.id, { status: 'completed' });

    const txType = tx.type as string;

    if (txType === 'donation') {
      const donations = await queryFirestoreDocuments(
        COLLECTIONS.DONATIONS,
        'depositId',
        'EQUAL',
        depositId
      );

      for (const donation of donations) {
        if (donation.status === 'active') continue;

        await updateFirestoreDocument(COLLECTIONS.DONATIONS, donation.id, { status: 'active' });

        if (donation.campaignId && donation.orgId) {
          const orgReceives = (donation.orgReceives as number) || 0;
          if (orgReceives > 0) {
            await incrementFirestoreField(
              COLLECTIONS.ORGANIZATIONS,
              donation.orgId as string,
              'raisedAmount',
              orgReceives,
              SUBCOLLECTIONS.CAMPAIGNS,
              donation.campaignId as string
            );
          }
        }
      }
    }

    if (txType === 'membership') {
      const memberships = await queryFirestoreDocuments(
        COLLECTIONS.MEMBERSHIPS,
        'depositId',
        'EQUAL',
        depositId
      );

      for (const membership of memberships) {
        if (membership.status === 'active') continue;

        await updateFirestoreDocument(COLLECTIONS.MEMBERSHIPS, membership.id, { status: 'active' });

        if (membership.orgId && membership.userId) {
          await updateFirestoreDocument(
            COLLECTIONS.ORGANIZATIONS,
            membership.orgId as string,
            { status: 'active' },
            SUBCOLLECTIONS.MEMBERS,
            membership.userId as string
          );
        }
      }
    }
  }
}

async function finalizeFailedDeposit(depositId: string): Promise<void> {
  const txs = await queryFirestoreDocuments(
    COLLECTIONS.TRANSACTIONS,
    'depositId',
    'EQUAL',
    depositId
  );

  for (const tx of txs) {
    if (tx.status === 'failed') continue;

    await updateFirestoreDocument(COLLECTIONS.TRANSACTIONS, tx.id, { status: 'failed' });
  }
}
