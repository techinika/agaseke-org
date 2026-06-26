import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/flutterwave';
import { completeDeposit, failDeposit } from '@/lib/payments';

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

    try {
      const tx = await verifyTransaction(depositId);

      if (tx.status === 'successful') {
        await completeDeposit(depositId);
        return NextResponse.json({ status: 'completed' });
      }

      if (tx.status === 'failed') {
        const failureReason = tx.failure_reason || 'Payment was declined.';
        await failDeposit(depositId, failureReason);
        return NextResponse.json({ status: 'failed', failureReason });
      }

      return NextResponse.json({
        status: 'processing',
        message: 'Payment is still processing. Please check back later.',
      });
    } catch {
      return NextResponse.json({
        status: 'processing',
        message: 'Could not verify payment status yet. Please check back later.',
      });
    }
  } catch (error) {
    console.error('Payment finalize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Finalization failed' },
      { status: 500 }
    );
  }
}
