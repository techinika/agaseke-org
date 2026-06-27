import { verifyTransaction } from '@/lib/flutterwave';
import {
  queryFirestoreDocuments,
  updateFirestoreDocument,
  incrementFirestoreField,
} from '@/lib/firebase/server';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { sendDonationEmails, sendMembershipEmails, sendDonationFailedEmails, sendMembershipFailedEmails } from '@/lib/email/payment-emails';

export async function completeDeposit(depositId: string): Promise<{ completed: number; failed: number }> {
  const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
  let completed = 0;
  let failed = 0;

  for (const tx of txs) {
    if (tx.status === 'completed') { completed++; continue; }
    if (tx.status === 'failed') { failed++; continue; }

    await updateFirestoreDocument(COLLECTIONS.TRANSACTIONS, tx.id, { status: 'completed' });
    const txType = tx.type as string;
    const orgId = tx.orgId as string | undefined;

    if (txType === 'donation') {
      await processDonation(depositId, orgId);
    }

    if (txType === 'membership') {
      await processMembership(depositId);
    }

    completed++;
  }

  return { completed, failed };
}

export async function failDeposit(depositId: string, failureReason?: string): Promise<void> {
  const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
  const processed = new Set<string>();

  for (const tx of txs) {
    if (tx.status === 'completed') continue;
    if (tx.status === 'failed') continue;
    await updateFirestoreDocument(COLLECTIONS.TRANSACTIONS, tx.id, { status: 'failed' });

    const txType = tx.type as string;
    if (processed.has(txType)) continue;
    processed.add(txType);

    if (txType === 'donation') {
      const donations = await queryFirestoreDocuments(COLLECTIONS.DONATIONS, 'depositId', 'EQUAL', depositId);
      for (const donation of donations) {
        if (donation.status === 'failed') continue;
        if (donation.status === 'active') continue;
        await updateFirestoreDocument(COLLECTIONS.DONATIONS, donation.id, { status: 'failed' });
        await sendDonationFailedEmails(donation, tx.orgId as string | undefined, failureReason);
      }
    }

    if (txType === 'membership') {
      const memberships = await queryFirestoreDocuments(COLLECTIONS.MEMBERSHIPS, 'depositId', 'EQUAL', depositId);
      for (const membership of memberships) {
        await sendMembershipFailedEmails(membership, failureReason);
      }
    }
  }
}

async function processDonation(depositId: string, orgId?: string): Promise<void> {
  const donations = await queryFirestoreDocuments(COLLECTIONS.DONATIONS, 'depositId', 'EQUAL', depositId);
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

    await sendDonationEmails(donation, orgId);
  }
}

async function processMembership(depositId: string): Promise<void> {
  const memberships = await queryFirestoreDocuments(COLLECTIONS.MEMBERSHIPS, 'depositId', 'EQUAL', depositId);
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

    await sendMembershipEmails(membership);
  }
}

export async function reconcilePendingTransaction(
  depositId: string
): Promise<'completed' | 'failed' | 'skipped'> {
  try {
    const tx = await verifyTransaction(depositId);

    if (tx.status === 'successful') {
      await completeDeposit(depositId);
      return 'completed';
    }

    if (tx.status === 'failed') {
      await failDeposit(depositId, tx.failure_reason || 'Payment failed.');
      return 'failed';
    }

    return 'skipped';
  } catch {
    return 'skipped';
  }
}
