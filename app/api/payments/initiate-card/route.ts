import { NextRequest, NextResponse } from 'next/server';
import { submitOrderRequest, registerIpnUrl } from '@/lib/pesapal';
import { queryFirestoreDocuments, updateFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { depositId, amount, returnUrl, reason, email, firstName, lastName } = body;

    if (!depositId || !amount || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: depositId, amount, returnUrl' },
        { status: 400 }
      );
    }

    let notificationId = process.env.PESAPAL_IPN_ID;
    if (!notificationId) {
      const ipnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/pesapal-ipn`;
      notificationId = await registerIpnUrl(ipnUrl);
    }

    const order = await submitOrderRequest({
      id: depositId,
      amount,
      currency: 'RWF',
      description: reason || 'Payment',
      callbackUrl: returnUrl,
      notificationId,
      billingAddress: {
        emailAddress: email || 'supporter@agaseke.org',
        firstName: firstName || 'Supporter',
        lastName: lastName || 'Agaseke',
        countryCode: 'RW',
      },
    });

    const txs = await queryFirestoreDocuments(COLLECTIONS.TRANSACTIONS, 'depositId', 'EQUAL', depositId);
    const tx = txs[0];
    if (tx) {
      await updateFirestoreDocument(COLLECTIONS.TRANSACTIONS, tx.id, {
        orderTrackingId: order.order_tracking_id,
      });
    }

    return NextResponse.json({ redirectUrl: order.redirect_url });
  } catch (error) {
    console.error('PesaPal initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Card payment initiation failed' },
      { status: 500 }
    );
  }
}
