import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment } from '@/lib/flutterwave';
import { paymentInitiateSchema } from '@/lib/api-validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = paymentInitiateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { depositId, amount, returnUrl, reason, email, name, slug, orgName } = parsed.data;

    const { link } = await initiatePayment({
      tx_ref: depositId,
      amount,
      redirect_url: returnUrl,
      customer: { email: email || 'support@quorum.app', name: name || 'Supporter' },
      title: orgName || 'Quorum',
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
