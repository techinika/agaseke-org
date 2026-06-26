import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus } from '@/lib/pesapal';
import { queryFirestoreDocuments } from '@/lib/firebase/server';
import { COLLECTIONS } from '@/lib/constants';
import { completeDeposit, failDeposit } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body;

    if (OrderNotificationType !== 'IPNCHANGE') {
      return NextResponse.json({
        orderNotificationType: OrderNotificationType,
        orderTrackingId: OrderTrackingId,
        orderMerchantReference: OrderMerchantReference,
        status: 200,
      });
    }

    if (!OrderTrackingId) {
      return NextResponse.json({ error: 'Missing OrderTrackingId' }, { status: 400 });
    }

    const depositId = OrderMerchantReference || OrderTrackingId;

    const statusData = await getTransactionStatus(OrderTrackingId);

    if (statusData.payment_status_description === 'Completed') {
      await completeDeposit(depositId);
    } else {
      await failDeposit(depositId, `PesaPal status: ${statusData.payment_status_description || 'Failed'}`);
    }

    return NextResponse.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    });
  } catch (error) {
    console.error('PesaPal IPN error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'IPN processing failed' },
      { status: 500 }
    );
  }
}
