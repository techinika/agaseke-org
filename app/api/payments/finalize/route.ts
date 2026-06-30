import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/flutterwave';
import { completeDeposit, failDeposit } from '@/lib/payments';
import { paymentFinalizeSchema } from '@/lib/api-validations';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const correlationId = `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logger.info('payment-finalize', `Request received [${correlationId}]`);

  try {
    const body = await request.json();
    const parsed = paymentFinalizeSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('payment-finalize', `Validation failed [${correlationId}]`, parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { depositId, type } = parsed.data;
    logger.info('payment-finalize', `Validated [${correlationId}]: depositId=${depositId}, type=${type}`);

    try {
      const tx = await verifyTransaction(depositId);
      logger.info('payment-finalize', `Flutterwave verification [${correlationId}]: depositId=${depositId}, status=${tx.status}`);

      if (tx.status === 'successful') {
        logger.info('payment-finalize', `Completing deposit [${correlationId}]: depositId=${depositId}`);
        await completeDeposit(depositId);
        return NextResponse.json({ status: 'completed' });
      }

      if (tx.status === 'failed') {
        const failureReason = tx.failure_reason || 'Payment was declined.';
        logger.warn('payment-finalize', `Failing deposit [${correlationId}]: depositId=${depositId}, reason=${failureReason}`);
        await failDeposit(depositId, failureReason);
        return NextResponse.json({ status: 'failed', failureReason });
      }

      logger.info('payment-finalize', `Payment still processing [${correlationId}]: depositId=${depositId}, status=${tx.status}`);
      return NextResponse.json({
        status: 'processing',
        message: 'Payment is still processing. Please check back later.',
      });
    } catch (verifyErr) {
      logger.warn('payment-finalize', `Verification failed [${correlationId}]: depositId=${depositId}`, verifyErr);
      return NextResponse.json({
        status: 'processing',
        message: 'Could not verify payment status yet. Please check back later.',
      });
    }
  } catch (error) {
    logger.error('payment-finalize', `Top-level error [${correlationId}]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Finalization failed' },
      { status: 500 }
    );
  }
}
