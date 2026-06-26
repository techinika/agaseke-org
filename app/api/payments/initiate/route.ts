import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment, getFlutterwavePaymentOptions } from '@/lib/flutterwave';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { depositId, amount, returnUrl, reason, email, name, paymentMethod, slug, orgName } = body;

    if (!depositId || !amount || !returnUrl) {
      return NextResponse.json({ error: 'Missing required fields: depositId, amount, returnUrl' }, { status: 400 });
    }

    const payment_options = paymentMethod ? getFlutterwavePaymentOptions(paymentMethod) : undefined;

    const { link } = await initiatePayment({
      tx_ref: depositId,
      amount,
      redirect_url: returnUrl,
      customer: { email: email || 'supporter@agaseke.org', name: name || 'Supporter' },
      payment_options,
      title: orgName || 'Agaseke',
      description: reason || 'Payment',
      meta: {
        slug: slug || '',
        depositId,
      },
    });

    return NextResponse.json({ redirectUrl: link });
  } catch (error) {
    console.error('Flutterwave initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment initiation failed' },
      { status: 500 }
    );
  }
}
