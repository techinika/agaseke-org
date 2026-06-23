'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, CreditCard, RefreshCw, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shared/empty-state';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useUserMembership } from '@/hooks/use-memberships';
import { useTiers } from '@/hooks/use-tiers';
import { format } from 'date-fns';
import { CURRENCY } from '@/lib/constants';

export default function MyMembershipPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: membership, isLoading: membershipLoading } = useUserMembership(org?.id ?? '', user?.uid ?? '');
  const { data: tiers } = useTiers(org?.id ?? '');
  const tier = tiers?.find((t) => t.id === membership?.tierId);
  const isLoading = orgLoading || membershipLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-2xl font-bold">Sign in to view your membership</h1>
        <Link href={`/auth/login?redirect=/org/${slug}/my-membership`}>
          <Button className="mt-4">Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!membership || !tier) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <EmptyState
          icon={CreditCard}
          title="No active membership"
          description="You haven't joined this organization yet."
          action={
            <Link href={`/org/${slug}/join`}>
              <Button>
                View membership plans
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My Membership</h1>
        <p className="text-muted-foreground">{org?.name}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <CardDescription>{org?.name}</CardDescription>
            </div>
            <Badge
              className={
                membership.status === 'active'
                  ? 'bg-success text-success-foreground'
                  : membership.status === 'expired'
                    ? 'bg-destructive text-destructive-foreground'
                    : undefined
              }
            >
              {membership.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-lg font-semibold">
                {tier.price.toLocaleString()} {CURRENCY}
                <span className="text-sm font-normal text-muted-foreground">
                  /{tier.billingCycle === 'one_time' ? 'once' : tier.billingCycle}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="text-lg font-semibold">
                {format(membership.startDate.toDate(), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Renewal date</p>
              <p className="text-lg font-semibold">
                {format(membership.renewsAt.toDate(), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auto-renew</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                <RefreshCw className="size-4" />
                {membership.autoRenew ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-sm font-medium">Your benefits</p>
            <div className="space-y-2">
              {tier.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
