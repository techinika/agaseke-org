import { NextRequest, NextResponse } from 'next/server';
import { readFirestoreDocument, updateFirestoreDocument, createFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS, SUBSCRIPTION_PRICING, type SubscriptionPlan } from '@/lib/constants';
import { generateOrderId } from '@/lib/pesapal';
import { getAppUrl } from '@/lib/app-url';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get organization by slug
    const orgs = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug) as Record<string, unknown> | null;
    if (!orgs) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get member count
    const membersRes = await readFirestoreDocument(
      COLLECTIONS.ORGANIZATIONS,
      slug,
      'members'
    );
    const members = Array.isArray(membersRes) ? membersRes : [];
    const activeMembers = members.filter((m: Record<string, unknown>) => m.status === 'active').length;

    const plan = (orgs.subscriptionPlan as SubscriptionPlan) || 'starter';

    return NextResponse.json({
      plan,
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
    const body = await request.json();
    const { plan } = body;

    if (!plan || !['starter', 'growth', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get current org
    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug) as Record<string, unknown> | null;
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const currentPlan = (org.subscriptionPlan as SubscriptionPlan) || 'starter';
    const targetPlan = plan as SubscriptionPlan;

    // If downgrading to starter, update directly (free)
    if (targetPlan === 'starter') {
      await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug, {
        subscriptionPlan: 'starter',
        subscriptionEndDate: null,
      });
      return NextResponse.json({ success: true, plan: 'starter' });
    }

    // For paid plans, initiate payment via PesaPal
    const planInfo = SUBSCRIPTION_PRICING[targetPlan];
    const orderId = generateOrderId();
    const appUrl = getAppUrl();
    const returnUrl = `${appUrl}/org/${slug}/subscription/return/${orderId}`;

    // Create subscription transaction
    await createFirestoreDocument(COLLECTIONS.TRANSACTIONS, {
      orgId: org.id,
      userId: (org.adminIds as string[])?.[0] || 'system',
      amount: planInfo.price,
      platformFee: 0,
      orgReceives: planInfo.price,
      currency: 'USD',
      type: 'subscription',
      referenceId: orderId,
      depositId: orderId,
      status: 'pending',
      paymentMethod: 'pesapal_card',
      createdAt: new Date(),
    });

    // Update org with pending subscription
    await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug, {
      subscriptionPlan: targetPlan,
    });

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      orderId,
      amount: planInfo.price,
      plan: targetPlan,
    });
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
