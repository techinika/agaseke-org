'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Users, ArrowUpRight } from 'lucide-react';
import { SUBSCRIPTION_PRICING, type SubscriptionPlan } from '@/lib/constants';
import Link from 'next/link';

interface SubscriptionStatusCardProps {
  currentPlan: SubscriptionPlan;
  memberCount: number;
  orgSlug: string;
}

const planColors: Record<SubscriptionPlan, string> = {
  starter: 'bg-muted text-muted-foreground',
  growth: 'bg-primary/10 text-primary',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const planIcons: Record<SubscriptionPlan, typeof Crown> = {
  starter: Crown,
  growth: Crown,
  enterprise: Crown,
};

export function SubscriptionStatusCard({ currentPlan, memberCount, orgSlug }: SubscriptionStatusCardProps) {
  const plan = SUBSCRIPTION_PRICING[currentPlan];
  const Icon = planIcons[currentPlan];
  const memberPercentage = Math.min((memberCount / plan.maxMembers) * 100, 100);
  const isNearLimit = memberPercentage >= 80;
  const isAtLimit = memberPercentage >= 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-xl ${planColors[currentPlan]}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>Your subscription plan and usage</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={planColors[currentPlan]}>
            {plan.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Monthly price</p>
            <p className="text-2xl font-bold">
              {plan.price === 0 ? 'Free' : `$${plan.price}`}
            </p>
            {plan.price > 0 && <p className="text-xs text-muted-foreground">per month</p>}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Transaction fee</p>
            <p className="text-2xl font-bold">{(plan.platformFeeRate * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">on donations & memberships</p>
          </div>
        </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                Members
              </span>
              <span className="font-medium">
                {memberCount} / {plan.maxMembers === Infinity ? '∞' : plan.maxMembers.toLocaleString()}
              </span>
            </div>
            <div className={`h-2 rounded-full bg-muted ${isAtLimit ? 'bg-destructive/20' : isNearLimit ? 'bg-yellow-200 dark:bg-yellow-900/30' : ''}`}>
              <div
                className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${memberPercentage}%` }}
              />
            </div>
            {isAtLimit && (
            <p className="text-xs text-destructive">
              You have reached the member limit for your current plan. Upgrade to add more members.
            </p>
          )}
          {isNearLimit && !isAtLimit && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              You are approaching the member limit for your current plan.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="text-sm font-medium">Plan features</h4>
          <ul className="mt-2 space-y-1">
            <li className="text-xs text-muted-foreground">
              • {currentPlan === 'starter' ? '10%' : '5%'} transaction fee
            </li>
            <li className="text-xs text-muted-foreground">
              • Unlimited donation campaigns
            </li>
            <li className="text-xs text-muted-foreground">
              • White-labeled pages
            </li>
            {currentPlan !== 'starter' && (
              <li className="text-xs text-muted-foreground">
                • Priority support
              </li>
            )}
            {currentPlan === 'enterprise' && (
              <>
                <li className="text-xs text-muted-foreground">
                  • Custom domain name
                </li>
                <li className="text-xs text-muted-foreground">
                  • Dedicated account manager
                </li>
              </>
            )}
          </ul>
        </div>

        <Link href={`/org/${orgSlug}/subscription`}>
          <Button className="w-full" variant="outline">
            Manage subscription
            <ArrowUpRight className="ml-2 size-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
