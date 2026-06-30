import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment, getFlutterwavePaymentOptions } from '@/lib/flutterwave';
import { paymentInitiateSchema } from '@/lib/api-validations';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const correlationId = `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logger.info('payment-initiate', `Request received [${correlationId}]`);

  try {
    const body = await request.json();
    const parsed = paymentInitiateSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('payment-initiate', `Validation failed [${correlationId}]`, parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { depositId, amount, returnUrl, reason, email, name, slug, orgName, paymentMethod } = parsed.data;
    logger.info('payment-initiate', `Initiate [${correlationId}]: depositId=${depositId}, amount=${amount}, slug=${slug}, paymentMethod=${paymentMethod}`);

    const { link } = await initiatePayment({
      tx_ref: depositId,
      amount,
      redirect_url: returnUrl,
      customer: { email: email || 'support@quorum.app', name: name || 'Supporter' },
      payment_options: paymentMethod ? getFlutterwavePaymentOptions(paymentMethod) : undefined,
      title: orgName || 'Quorum',
      description: reason || 'Payment',
      meta: {
        slug: slug || '',
        depositId,
      },
    });

    logger.info('payment-initiate', `Payment link created [${correlationId}]: depositId=${depositId}, link=${link.slice(0, 80)}...`);
    return NextResponse.json({ redirectUrl: link });
  } catch (error) {
    logger.error('payment-initiate', `Initiation failed [${correlationId}]`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment initiation failed' },
      { status: 500 }
    );
  }
}
