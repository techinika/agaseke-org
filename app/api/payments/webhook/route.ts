import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookHash } from '@/lib/flutterwave';
import { completeDeposit, failDeposit } from '@/lib/payments';

const WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH;
const RECENT_EVENTS = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const textBody = await request.text();
    const verifHash = request.headers.get('verif-hash') || '';

    try {
      if (WEBHOOK_HASH && !verifyWebhookHash(verifHash)) {
        return NextResponse.json({ error: 'Invalid webhook hash' }, { status: 401 });
      }
    } catch (err) {
      console.error('Webhook verification error:', err);
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(textBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const event = body.event as string | undefined;
    if (event !== 'charge.completed') {
      console.warn(`Webhook received unhandled event type: ${event}`);
      return NextResponse.json({ status: 'ignored', message: `Event type ${event} not processed` });
    }

    const data = body.data as Record<string, unknown> | undefined;
    const txRef = data?.tx_ref as string | undefined;
    const flwStatus = data?.status as string | undefined;

    if (!txRef) {
      return NextResponse.json({ error: 'Missing tx_ref in webhook data' }, { status: 400 });
    }

    // Idempotency guard: skip if we've already processed this tx_ref recently
    if (RECENT_EVENTS.has(txRef)) {
      return NextResponse.json({ status: 'already_processed', message: 'Duplicate webhook, skipped' });
    }
    RECENT_EVENTS.add(txRef);
    setTimeout(() => RECENT_EVENTS.delete(txRef), 60000);

    if (flwStatus === 'successful') {
      await completeDeposit(txRef);
      return NextResponse.json({ status: 'completed' });
    }

    if (flwStatus === 'failed') {
      const failureReason = (data?.failure_reason as string) || 'Payment was declined.';
      await failDeposit(txRef, failureReason);
      return NextResponse.json({ status: 'failed' });
    }

    return NextResponse.json({ status: flwStatus, message: 'Not a final status, no action taken' });
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
