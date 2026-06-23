import { NextRequest, NextResponse } from 'next/server';
import { initiatePaymentPage } from '@/lib/pawapay';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { depositId, amount, returnUrl, reason } = body;

    if (!depositId || !amount || !returnUrl) {
      return NextResponse.json({ error: 'Missing required fields: depositId, amount, returnUrl' }, { status: 400 });
    }

    const { redirectUrl } = await initiatePaymentPage(depositId, {
      amount: String(amount),
      returnUrl,
      reason: reason || 'Payment',
    });

    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error('pawaPay initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment initiation failed' },
      { status: 500 }
    );
  }
}
