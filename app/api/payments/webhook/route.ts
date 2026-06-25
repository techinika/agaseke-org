import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkDepositStatus } from '@/lib/pawapay';
import { completeDeposit, failDeposit } from '@/lib/payments';

const WEBHOOK_SECRET = process.env.PAWAPAY_WEBHOOK_SECRET;

function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true;
  try {
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
    return expected === signature;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const textBody = await request.text();
    const signature = request.headers.get('x-pawapay-signature') || '';

    if (WEBHOOK_SECRET && !verifyWebhookSignature(textBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(textBody);
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
      await completeDeposit(depositId);
      return NextResponse.json({ status: 'completed' });
    }

    if (deposit.status === 'FAILED') {
      const failureReason = deposit.failureReason?.failureMessage || 'Payment was declined.';
      await failDeposit(depositId, failureReason);
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
