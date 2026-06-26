import { NextRequest, NextResponse } from 'next/server';
import { checkDepositStatus } from '@/lib/pawapay';
import { getTransactionStatus } from '@/lib/pesapal';
import { completeDeposit, failDeposit } from '@/lib/payments';
import { queryFirestoreDocuments } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { depositId, type } = body;

    if (!depositId || !type) {
      return NextResponse.json({ error: 'Missing depositId or type' }, { status: 400 });
    }

    if (type !== 'donation' && type !== 'membership') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
    const tx = txs[0];
    const paymentMethod = (tx?.paymentMethod as string) || 'pawapay';

    if (paymentMethod === 'pesapal') {
      return await handlePesaPalFinalize(depositId);
    }

    return await handlePawaPayFinalize(depositId);
  } catch (error) {
    console.error('Payment finalize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Finalization failed' },
      { status: 500 }
    );
  }
}

async function handlePawaPayFinalize(depositId: string): Promise<NextResponse> {
  const result = await checkDepositStatus(depositId);

  if (result.status === 'NOT_FOUND') {
    return NextResponse.json({ status: 'not_found' });
  }

  const deposit = result.data!;
  const status = deposit.status;

  if (status === 'COMPLETED') {
    await completeDeposit(depositId);
    return NextResponse.json({ status: 'completed' });
  }

  if (status === 'FAILED') {
    const failureReason = deposit.failureReason?.failureMessage || 'Payment was declined.';
    await failDeposit(depositId, failureReason);
    return NextResponse.json({ status: 'failed', failureReason });
  }

  return NextResponse.json({
    status: status.toLowerCase(),
    message: 'Payment is still processing. Please check back later.',
  });
}

async function handlePesaPalFinalize(depositId: string): Promise<NextResponse> {
  const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
  const tx = txs[0];
  const orderTrackingId = tx?.orderTrackingId as string | undefined;

  if (!orderTrackingId) {
    return NextResponse.json({ status: 'processing', message: 'Order is being created...' });
  }

  try {
    const statusData = await getTransactionStatus(orderTrackingId);
    const desc = statusData.payment_status_description || '';

    if (desc === 'Completed') {
      await completeDeposit(depositId);
      return NextResponse.json({ status: 'completed' });
    }

    if (desc === 'Failed' || desc === 'Cancelled' || desc === 'Declined') {
      await failDeposit(depositId, `Card payment ${desc.toLowerCase()}.`);
      return NextResponse.json({ status: 'failed', failureReason: `Payment was ${desc.toLowerCase()}.` });
    }

    return NextResponse.json({
      status: 'processing',
      message: 'Card payment is still processing. Please check back later.',
    });
  } catch {
    return NextResponse.json({
      status: 'processing',
      message: 'Could not verify card payment status yet. Please check back later.',
    });
  }
}
