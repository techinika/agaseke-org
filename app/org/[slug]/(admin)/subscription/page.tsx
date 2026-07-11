'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Crown, Users, ArrowUp, ArrowDown, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { SUBSCRIPTION_PRICING, type SubscriptionPlan } from '@/lib/constants';
import { UpgradeDowngradeDialog } from '@/components/shared/upgrade-downgrade-dialog';
import { toast } from 'sonner';

const planOrder: SubscriptionPlan[] = ['starter', 'growth', 'enterprise'];

const planColors: Record<SubscriptionPlan, string> = {
  starter: 'bg-muted text-muted-foreground',
  growth: 'bg-primary/10 text-primary',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function SubscriptionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('starter');
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan>('growth');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/org/${slug}/subscription`);
        if (res.ok) {
          const data = await res.json();
          setCurrentPlan(data.plan || 'starter');
          setMemberCount(data.memberCount || 0);
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const plan = SUBSCRIPTION_PRICING[currentPlan];
  const memberPercentage = Math.min((memberCount / plan.maxMembers) * 100, 100);
  const isNearLimit = memberPercentage >= 80;
  const isAtLimit = memberPercentage >= 100;

  function handleUpgrade(target: SubscriptionPlan) {
    setTargetPlan(target);
    setDialogOpen(true);
  }

  async function handleConfirmPlanChange() {
    // In production, this would call PesaPal for subscription billing
    // For now, just update the plan directly
    const res = await fetch(`/api/org/${slug}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: targetPlan }),
    });

    if (!res.ok) throw new Error('Failed to update plan');
    setCurrentPlan(targetPlan);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Manage your organization&apos;s subscription plan</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-xl ${planColors[currentPlan]}`}>
                <Crown className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Current Plan</CardTitle>
                <CardDescription>{plan.label} plan</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={planColors[currentPlan]}>
              {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
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
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                You have reached the member limit. Upgrade to add more members.
              </div>
            )}
            {isNearLimit && !isAtLimit && (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="size-4" />
                You are approaching the member limit for your current plan.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {planOrder.map((planKey) => {
          const planInfo = SUBSCRIPTION_PRICING[planKey];
          const isCurrent = planKey === currentPlan;
          const isHigher = planOrder.indexOf(planKey) > planOrder.indexOf(currentPlan);

          return (
            <Card key={planKey} className={isCurrent ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{planInfo.label}</CardTitle>
                  {isCurrent && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {planKey === 'starter' && 'Up to 500 members'}
                  {planKey === 'growth' && '500 – 1,000 members'}
                  {planKey === 'enterprise' && '1,000+ members'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">
                    {planInfo.price === 0 ? 'Free' : `$${planInfo.price}`}
                  </span>
                  {planInfo.price > 0 && (
                    <span className="text-muted-foreground">/mo</span>
                  )}
                </div>

                <div className="rounded-lg bg-muted/50 px-3 py-2 text-center text-sm font-medium">
                  {(planInfo.platformFeeRate * 100).toFixed(0)}% transaction fee
                </div>

                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    Unlimited donation campaigns
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    White-labeled pages
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    Bank payout settings
                  </li>
                  {planKey !== 'starter' && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-primary" />
                      Priority support
                    </li>
                  )}
                  {planKey === 'enterprise' && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-primary" />
                      Custom domain name
                    </li>
                  )}
                </ul>

                {!isCurrent && (
                  <Button
                    className="w-full"
                    variant={isHigher ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(planKey)}
                  >
                    {isHigher ? (
                      <>
                        <ArrowUp className="mr-2 size-4" />
                        Upgrade
                      </>
                    ) : (
                      <>
                        <ArrowDown className="mr-2 size-4" />
                        Downgrade
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing Information</CardTitle>
          <CardDescription>How billing works for your subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Payment method</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Credit card via PesaPal
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Billing cycle</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Monthly, cancel anytime
              </p>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="text-sm font-medium">How fees work</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Starter plan: 10% platform fee on all donations and memberships</li>
              <li>• Growth & Enterprise plans: 5% platform fee on all donations and memberships</li>
              <li>• Subscription fee is separate from the transaction fee</li>
              <li>• Choose who pays the transaction fee: your organization or the donor</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <UpgradeDowngradeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentPlan={currentPlan}
        targetPlan={targetPlan}
        onConfirm={handleConfirmPlanChange}
      />
    </div>
  );
}
