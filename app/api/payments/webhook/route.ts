import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookHash } from '@/lib/flutterwave';
import { completeDeposit, failDeposit } from '@/lib/payments';
import { logger } from '@/lib/logger';

const WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH;
const RECENT_EVENTS = new Set<string>();

export async function POST(request: NextRequest) {
  const correlationId = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  logger.info('webhook', `Received webhook request [${correlationId}]`);

  try {
    const textBody = await request.text();
    const bodyLength = textBody.length;
    logger.info('webhook', `Raw body received [${correlationId}]: ${bodyLength} bytes, preview: ${textBody.slice(0, 500)}`);

    const verifHash = request.headers.get('verif-hash') || '';
    logger.info('webhook', `verif-hash header [${correlationId}]: ${verifHash ? 'present' : 'MISSING'}`);

    try {
      if (WEBHOOK_HASH && !verifyWebhookHash(verifHash)) {
        logger.warn('webhook', `Hash verification FAILED [${correlationId}] — verif-hash header does not match FLUTTERWAVE_WEBHOOK_HASH`);
        return NextResponse.json({ error: 'Invalid webhook hash' }, { status: 401 });
      }
      logger.info('webhook', `Hash verification passed [${correlationId}]`);
    } catch (err) {
      logger.error('webhook', `Hash verification threw [${correlationId}]`, err);
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(textBody);
    } catch (parseErr) {
      logger.error('webhook', `JSON parse FAILED [${correlationId}]: invalid payload`, {
        bodyPreview: textBody.slice(0, 1000),
        parseError: String(parseErr),
      });
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const event = body.event as string | undefined;
    const eventType = body['event.type'] as string | undefined;
    logger.info('webhook', `Event [${correlationId}]: type=${event}, event.type=${eventType}`);

    if (event !== 'charge.completed') {
      logger.warn('webhook', `Unhandled event type [${correlationId}]: ${event}`, { eventType });
      return NextResponse.json({ status: 'ignored', message: `Event type ${event} not processed` });
    }

    const data = body.data as Record<string, unknown> | undefined;
    if (!data) {
      logger.error('webhook', `Missing data field in webhook payload [${correlationId}]`);
      return NextResponse.json({ error: 'Missing data field' }, { status: 400 });
    }

    const txRef = data.tx_ref as string | undefined;
    const flwId = data.id as number | undefined;
    const flwStatus = data.status as string | undefined;
    const flwAmount = data.amount as number | undefined;
    const flwCurrency = data.currency as string | undefined;
    const flwChargedAmount = data.charged_amount as number | undefined;
    const flwProcessor = data.processor as string | undefined;
    const failureReason = data.failure_reason as string | undefined;

    logger.info('webhook', `Transaction data [${correlationId}]: tx_ref=${txRef}, flw_id=${flwId}, status=${flwStatus}, amount=${flwAmount} ${flwCurrency}, charged=${flwChargedAmount}, processor=${flwProcessor}`);

    if (!txRef) {
      logger.error('webhook', `Missing tx_ref in webhook data [${correlationId}]`, { flwId });
      return NextResponse.json({ error: 'Missing tx_ref in webhook data' }, { status: 400 });
    }

    if (RECENT_EVENTS.has(txRef)) {
      logger.warn('webhook', `Duplicate webhook skipped [${correlationId}]: tx_ref=${txRef} already processed recently`);
      return NextResponse.json({ status: 'already_processed', message: 'Duplicate webhook, skipped' });
    }
    RECENT_EVENTS.add(txRef);
    setTimeout(() => {
      RECENT_EVENTS.delete(txRef);
    }, 60000);

    if (flwStatus === 'successful') {
      logger.info('webhook', `Processing completed payment [${correlationId}]: tx_ref=${txRef}`);
      try {
        await completeDeposit(txRef);
        const elapsed = Date.now() - startTime;
        logger.info('webhook', `Payment completed successfully [${correlationId}]: tx_ref=${txRef} in ${elapsed}ms`);
      } catch (procErr) {
        logger.error('webhook', `completeDeposit FAILED [${correlationId}]: tx_ref=${txRef}`, procErr);
        return NextResponse.json(
          { error: 'Processing failed', txRef },
          { status: 500 }
        );
      }
      return NextResponse.json({ status: 'completed' });
    }

    if (flwStatus === 'failed') {
      const reason = failureReason || 'Payment was declined.';
      logger.warn('webhook', `Processing failed payment [${correlationId}]: tx_ref=${txRef}, reason=${reason}`,
        { flwId, flwStatus, failureReason });
      try {
        await failDeposit(txRef, reason);
        logger.info('webhook', `Payment failed processed [${correlationId}]: tx_ref=${txRef}`);
      } catch (procErr) {
        logger.error('webhook', `failDeposit FAILED [${correlationId}]: tx_ref=${txRef}`, procErr);
      }
      return NextResponse.json({ status: 'failed' });
    }

    logger.warn('webhook', `Non-final status [${correlationId}]: tx_ref=${txRef}, status=${flwStatus}, no action taken`);
    return NextResponse.json({ status: flwStatus, message: 'Not a final status, no action taken' });
  } catch (error) {
    logger.error('webhook', `Top-level error [${correlationId}]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
