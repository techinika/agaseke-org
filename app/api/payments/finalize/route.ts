import { NextRequest, NextResponse } from 'next/server';
import { checkDepositStatus } from '@/lib/pawapay';
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
      return NextResponse.json({
        status: 'failed',
        failureReason,
      });
    }

    return NextResponse.json({
      status: status.toLowerCase(),
      message: 'Payment is still processing. Please check back later.',
    });
  } catch (error) {
    console.error('Payment finalize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Finalization failed' },
      { status: 500 }
    );
  }
}
