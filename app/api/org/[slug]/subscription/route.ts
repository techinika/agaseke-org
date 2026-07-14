import { NextRequest, NextResponse } from 'next/server';
import { readFirestoreDocument, queryFirestoreDocuments, updateFirestoreDocument, createFirestoreDocument } from '@/lib/firebase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { COLLECTIONS, SUBSCRIPTION_PRICING, type SubscriptionPlan, type SubscriptionBillingCycle, SUBSCRIPTION_BILLING_CYCLES } from '@/lib/constants';
import { generateOrderId } from '@/lib/pesapal';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const orgs = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug) as Record<string, unknown> | null;
    if (!orgs) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const adminIds = (orgs.adminIds as string[]) || [];
    if (!adminIds.includes(decoded.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await queryFirestoreDocuments(COLLECTIONS.MEMBERSHIPS, 'orgId', 'EQUAL', slug);
    const activeMembers = members.filter((m: Record<string, unknown>) => m.status === 'active').length;

    const plan = (orgs.subscriptionPlan as SubscriptionPlan) || 'starter';
    const billingCycle = (orgs.subscriptionBillingCycle as SubscriptionBillingCycle) || 'monthly';

    return NextResponse.json({
      plan,
      billingCycle,
      memberCount: activeMembers,
      maxMembers: SUBSCRIPTION_PRICING[plan].maxMembers,
    });
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, billingCycle } = body;

    if (!plan || !['starter', 'growth', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const cycle: SubscriptionBillingCycle = SUBSCRIPTION_BILLING_CYCLES.includes(billingCycle) ? billingCycle : 'monthly';

    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug) as Record<string, unknown> | null;
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const adminIds = (org.adminIds as string[]) || [];
    if (!adminIds.includes(decoded.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetPlan = plan as SubscriptionPlan;

    if (targetPlan === 'starter') {
      await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug, {
        subscriptionPlan: 'starter',
        subscriptionBillingCycle: 'monthly',
        subscriptionEndDate: null,
      });
      return NextResponse.json({ success: true, plan: 'starter', billingCycle: 'monthly' });
    }

    const planInfo = SUBSCRIPTION_PRICING[targetPlan];
    const amount = cycle === 'yearly' ? planInfo.yearlyPrice : planInfo.price;
    const orderId = generateOrderId();

    await createFirestoreDocument(COLLECTIONS.TRANSACTIONS, {
      orgId: org.id,
      userId: decoded.uid,
      amount,
      platformFee: 0,
      orgReceives: amount,
      currency: 'USD',
      type: 'subscription',
      targetPlan,
      targetBillingCycle: cycle,
      referenceId: orderId,
      depositId: orderId,
      status: 'pending',
      paymentMethod: 'pesapal_card',
      billingCycle: cycle,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      orderId,
      amount,
      plan: targetPlan,
      billingCycle: cycle,
    });
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
