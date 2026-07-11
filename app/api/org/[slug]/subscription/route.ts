import { NextRequest, NextResponse } from 'next/server';
import { readFirestoreDocument, updateFirestoreDocument } from '@/lib/firebase/server';
import { COLLECTIONS, SUBSCRIPTION_PRICING, type SubscriptionPlan } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get organization
    const org = await readFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug) as Record<string, unknown> | null;
    if (!org) {
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

    const plan = (org.subscriptionPlan as SubscriptionPlan) || 'starter';

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

    // Update subscription plan
    await updateFirestoreDocument(COLLECTIONS.ORGANIZATIONS, slug, {
      subscriptionPlan: plan,
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
