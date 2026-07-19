import { verifyTransaction, mapPesapalStatus } from '@/lib/pesapal';
import {
  readFirestoreDocument,
  queryFirestoreDocuments,
  updateFirestoreDocument,
  incrementFirestoreField,
} from '@/lib/firebase/server';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { sendDonationEmails, sendMembershipEmails, sendDonationFailedEmails, sendMembershipFailedEmails } from '@/lib/email/payment-emails';
import { logger } from '@/lib/logger';

async function reReadTransaction(txId: string): Promise<{ processedAt?: string; status?: string } | null> {
  try {
    const doc = await readFirestoreDocument(COLLECTIONS.TRANSACTIONS, txId);
    if (!doc) {
      logger.warn('payments', `reReadTransaction: tx ${txId} not found`);
      return null;
    }
    return doc as { processedAt?: string; status?: string };
  } catch (err) {
    logger.error('payments', `reReadTransaction: read failed for tx ${txId}`, err);
    return null;
  }
}

async function safeSend(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.error('payments', 'Failed to send notification email', err);
  }
}

export async function completeDeposit(depositId: string): Promise<{ completed: number; failed: number }> {
  logger.info('payments', `completeDeposit: starting for depositId=${depositId}`);
  const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
  logger.info('payments', `completeDeposit: found ${txs.length} transactions for depositId=${depositId}`);
  let completed = 0;
  let failed = 0;

  for (const tx of txs) {
    logger.info('payments', `completeDeposit: processing tx ${tx.id} (depositId=${depositId})`);
    if (tx.processedAt) { logger.info('payments', `completeDeposit: tx ${tx.id} already has processedAt, skipping`); completed++; continue; }
    if (tx.status === 'completed') { logger.info('payments', `completeDeposit: tx ${tx.id} already completed, skipping`); completed++; continue; }
    if (tx.status === 'failed') { logger.info('payments', `completeDeposit: tx ${tx.id} already failed, skipping`); failed++; continue; }

    const fresh = await reReadTransaction(tx.id);
    if (!fresh || fresh.processedAt || fresh.status === 'completed') { logger.info('payments', `completeDeposit: re-read shows tx ${tx.id} already done, skipping`); completed++; continue; }
    if (fresh.status === 'failed') { logger.info('payments', `completeDeposit: re-read shows tx ${tx.id} already failed, skipping`); failed++; continue; }

    await updateFirestoreDocument(COLLECTIONS.TRANSACTIONS, tx.id, {
      status: 'completed',
      processedAt: new Date().toISOString(),
    });
    logger.info('payments', `completeDeposit: tx ${tx.id} marked completed`);

    const txType = tx.type as string;
    const orgId = tx.orgId as string | undefined;
    logger.info('payments', `completeDeposit: tx ${tx.id} type=${txType}, orgId=${orgId}`);

    if (txType === 'donation') {
      await processDonation(depositId, orgId);
    }

    if (txType === 'membership') {
      await processMembership(depositId);
    }

    if (txType === 'subscription') {
      await processSubscription(tx, depositId);
    }

    completed++;
  }

  logger.info('payments', `completeDeposit: done for depositId=${depositId}: completed=${completed}, failed=${failed}`);
  return { completed, failed };
}

export async function failDeposit(depositId: string, failureReason?: string): Promise<void> {
  logger.warn('payments', `failDeposit: starting for depositId=${depositId}, reason=${failureReason || 'none'}`);
  const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
  logger.info('payments', `failDeposit: found ${txs.length} transactions for depositId=${depositId}`);
  const processed = new Set<string>();

  for (const tx of txs) {
    logger.info('payments', `failDeposit: processing tx ${tx.id} (depositId=${depositId})`);
    if (tx.processedAt) { logger.info('payments', `failDeposit: tx ${tx.id} already has processedAt, skipping`); continue; }
    if (tx.status === 'completed') { logger.info('payments', `failDeposit: tx ${tx.id} already completed, skipping`); continue; }
    if (tx.status === 'failed') { logger.info('payments', `failDeposit: tx ${tx.id} already failed, skipping`); continue; }

    const fresh = await reReadTransaction(tx.id);
    if (!fresh || fresh.processedAt || fresh.status === 'completed') { logger.info('payments', `failDeposit: re-read shows tx ${tx.id} already done, skipping`); continue; }
    if (fresh.status === 'failed') { logger.info('payments', `failDeposit: re-read shows tx ${tx.id} already failed, skipping`); continue; }

    await updateFirestoreDocument(COLLECTIONS.TRANSACTIONS, tx.id, {
      status: 'failed',
      processedAt: new Date().toISOString(),
    });
    logger.info('payments', `failDeposit: tx ${tx.id} marked failed`);

    const txType = tx.type as string;
    if (processed.has(txType)) { logger.info('payments', `failDeposit: already processed type ${txType} for this deposit, skipping`); continue; }
    processed.add(txType);

    if (txType === 'donation') {
      const donations = await queryFirestoreDocuments(COLLECTIONS.DONATIONS, 'depositId', 'EQUAL', depositId);
      logger.info('payments', `failDeposit: found ${donations.length} donations to fail for depositId=${depositId}`);
      for (const donation of donations) {
        if (donation.status === 'failed') continue;
        if (donation.status === 'active') continue;
        await updateFirestoreDocument(COLLECTIONS.DONATIONS, donation.id, { status: 'failed' });
        logger.info('payments', `failDeposit: donation ${donation.id} marked failed`);
        await safeSend(() => sendDonationFailedEmails(donation, tx.orgId as string | undefined, failureReason));
      }
    }

    if (txType === 'membership') {
      const memberships = await queryFirestoreDocuments(COLLECTIONS.MEMBERSHIPS, 'depositId', 'EQUAL', depositId);
      logger.info('payments', `failDeposit: found ${memberships.length} memberships to fail for depositId=${depositId}`);
      for (const membership of memberships) {
        if (membership.status === 'failed') continue;
        if (membership.status === 'active') continue;
        await updateFirestoreDocument(COLLECTIONS.MEMBERSHIPS, membership.id, { status: 'failed' });
        logger.info('payments', `failDeposit: membership ${membership.id} marked failed`);
        if (membership.orgId && membership.userId) {
          await updateFirestoreDocument(
            COLLECTIONS.ORGANIZATIONS,
            membership.orgId as string,
            { status: 'failed' },
            SUBCOLLECTIONS.MEMBERS,
            membership.userId as string
          );
          logger.info('payments', `failDeposit: member ${membership.userId} marked failed in org ${membership.orgId}`);
        }
        await safeSend(() => sendMembershipFailedEmails(membership, failureReason));
      }
    }
  }

  logger.info('payments', `failDeposit: done for depositId=${depositId}`);
}

async function processDonation(depositId: string, orgId?: string): Promise<void> {
  logger.info('payments', `processDonation: starting for depositId=${depositId}`);
  const donations = await queryFirestoreDocuments(COLLECTIONS.DONATIONS, 'depositId', 'EQUAL', depositId);
  logger.info('payments', `processDonation: found ${donations.length} donations for depositId=${depositId}`);
  for (const donation of donations) {
    if (donation.status === 'active') { logger.info('payments', `processDonation: donation ${donation.id} already active, skipping`); continue; }
    await updateFirestoreDocument(COLLECTIONS.DONATIONS, donation.id, { status: 'active' });
    logger.info('payments', `processDonation: donation ${donation.id} marked active`);

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
        logger.info('payments', `processDonation: campaign ${donation.campaignId} incremented by ${orgReceives}`);
      }
    }

    await safeSend(() => sendDonationEmails(donation, orgId));
  }
}

async function processMembership(depositId: string): Promise<void> {
  logger.info('payments', `processMembership: starting for depositId=${depositId}`);
  const memberships = await queryFirestoreDocuments(COLLECTIONS.MEMBERSHIPS, 'depositId', 'EQUAL', depositId);
  logger.info('payments', `processMembership: found ${memberships.length} memberships for depositId=${depositId}`);
  for (const membership of memberships) {
    if (membership.status === 'active') { logger.info('payments', `processMembership: membership ${membership.id} already active, skipping`); continue; }
    await updateFirestoreDocument(COLLECTIONS.MEMBERSHIPS, membership.id, { status: 'active' });
    logger.info('payments', `processMembership: membership ${membership.id} marked active`);

    if (membership.orgId && membership.userId) {
      await updateFirestoreDocument(
        COLLECTIONS.ORGANIZATIONS,
        membership.orgId as string,
        { status: 'active' },
        SUBCOLLECTIONS.MEMBERS,
        membership.userId as string
      );
      logger.info('payments', `processMembership: member ${membership.userId} marked active in org ${membership.orgId}`);
    }

    await safeSend(() => sendMembershipEmails(membership));
  }
}

async function processSubscription(tx: Record<string, unknown>, depositId: string): Promise<void> {
  logger.info('payments', `processSubscription: starting for depositId=${depositId}`);
  const targetPlan = tx.targetPlan as string | undefined;
  const targetBillingCycle = tx.targetBillingCycle as string | undefined;
  const orgId = tx.orgId as string | undefined;
  const subscriptionMonths = (tx.subscriptionMonths as number) || 1;

  if (!targetPlan || !orgId) {
    logger.warn('payments', `processSubscription: missing targetPlan or orgId for depositId=${depositId}`);
    return;
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + subscriptionMonths);

  const updateData: Record<string, unknown> = {
    subscriptionPlan: targetPlan,
    subscriptionMonths,
    subscriptionStartDate: now.toISOString(),
    subscriptionEndDate: endDate.toISOString(),
  };
  if (targetBillingCycle) {
    updateData.subscriptionBillingCycle = targetBillingCycle;
  }

  await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, orgId, updateData);
  logger.info('payments', `processSubscription: org ${orgId} updated to plan=${targetPlan}, months=${subscriptionMonths}, endDate=${endDate.toISOString()}`);
}

export async function reconcilePendingTransaction(
  depositId: string
): Promise<'completed' | 'failed' | 'skipped'> {
  logger.info('payments', `reconcilePendingTransaction: checking depositId=${depositId}`);
  try {
    // Fetch transaction to get the stored orderTrackingId
    const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
    if (txs.length === 0) {
      logger.warn('payments', `reconcilePendingTransaction: no transactions found for depositId=${depositId}`);
      return 'skipped';
    }

    const tx = txs[0];
    const orderTrackingId = tx.orderTrackingId as string | undefined;
    if (!orderTrackingId) {
      logger.warn('payments', `reconcilePendingTransaction: no orderTrackingId stored for depositId=${depositId}`);
      return 'skipped';
    }

    // Verify with PesaPal using the stored orderTrackingId
    const pspTx = await verifyTransaction(orderTrackingId);
    logger.info('payments', `reconcilePendingTransaction: PesaPal status for depositId=${depositId}: ${pspTx.payment_status_description} (code=${pspTx.status_code})`);

    const mappedStatus = mapPesapalStatus(pspTx.status_code, pspTx.payment_status_description);

    if (mappedStatus === 'completed') {
      logger.info('payments', `reconcilePendingTransaction: completing depositId=${depositId}`);
      await completeDeposit(depositId);
      return 'completed';
    }

    if (mappedStatus === 'failed') {
      const reason = pspTx.description || 'Payment failed.';
      logger.warn('payments', `reconcilePendingTransaction: failing depositId=${depositId}, reason=${reason}`);
      await failDeposit(depositId, reason);
      return 'failed';
    }

    logger.info('payments', `reconcilePendingTransaction: depositId=${depositId} still pending (${pspTx.payment_status_description})`);
    return 'skipped';
  } catch (err) {
    logger.error('payments', `reconcilePendingTransaction: error for depositId=${depositId}`, err);
    return 'skipped';
  }
}
