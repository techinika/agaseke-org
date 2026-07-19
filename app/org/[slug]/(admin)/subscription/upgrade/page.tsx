'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowUp, ArrowDown, Crown, Check, Tag, Minus, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  SUBSCRIPTION_PRICING,
  type SubscriptionPlan,
  MULTI_MONTH_DISCOUNT_RATE,
  MIN_MONTHS_FOR_DISCOUNT,
  MAX_SUBSCRIPTION_MONTHS,
} from '@/lib/constants';
import { WORKERS } from '@/lib/workers';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

const planOrder: SubscriptionPlan[] = ['starter', 'growth', 'enterprise'];

function formatPrice(price: number): string {
  return price % 1 === 0 ? price.toString() : price.toFixed(2);
}

function UpgradePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { user } = useAuthStore();

  const currentPlan = (searchParams.get('currentPlan') as SubscriptionPlan) || 'starter';
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);

  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    const currentIdx = planOrder.indexOf(currentPlan);
    const targets = planOrder.filter((_, i) => i !== currentIdx);
    setAvailablePlans(targets);
  }, [currentPlan]);

  function calculatePrice(planKey: SubscriptionPlan, selectedMonths: number) {
    const info = SUBSCRIPTION_PRICING[planKey];
    const monthlyRate = info.price;
    const subtotal = monthlyRate * selectedMonths;
    const hasDiscount = selectedMonths >= MIN_MONTHS_FOR_DISCOUNT;
    const discountAmount = hasDiscount ? Math.round(subtotal * MULTI_MONTH_DISCOUNT_RATE * 100) / 100 : 0;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const perMonthEffective = selectedMonths > 0 ? Math.round((total / selectedMonths) * 100) / 100 : 0;

    return { monthlyRate, subtotal, hasDiscount, discountAmount, total, perMonthEffective };
  }

  async function handlePlanChange(targetPlan: SubscriptionPlan) {
    if (!user) {
      toast.error('Please log in to change your plan');
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${WORKERS.subscriptions.url}/change-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WORKERS.subscriptions.apiKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, plan: targetPlan, months }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to update plan');
      }

      const data = await res.json();

      if (data.requiresPayment && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      toast.success(`Successfully changed to ${SUBSCRIPTION_PRICING[targetPlan].label} plan`);
      router.push(`/org/${slug}/subscription`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change plan');
    } finally {
      setLoading(false);
    }
  }

  const currentInfo = SUBSCRIPTION_PRICING[currentPlan];

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/org/${slug}/subscription`)}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to subscription
        </Button>
        <h1 className="text-2xl font-bold">Change Plan</h1>
        <p className="text-muted-foreground">
          Currently on <strong>{currentInfo.label}</strong> plan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Duration</CardTitle>
          <CardDescription>Select how many months to commit to</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setMonths(Math.max(1, months - 1))}
              disabled={months <= 1}
            >
              <Minus className="size-4" />
            </Button>
            <div className="flex gap-1 flex-wrap justify-center flex-1">
              {Array.from({ length: MAX_SUBSCRIPTION_MONTHS }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`h-8 min-w-8 rounded-md px-2 text-xs font-medium transition-colors ${
                    m === months
                      ? 'bg-primary text-primary-foreground'
                      : m >= MIN_MONTHS_FOR_DISCOUNT
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                        : 'bg-background hover:bg-muted'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setMonths(Math.min(MAX_SUBSCRIPTION_MONTHS, months + 1))}
              disabled={months >= MAX_SUBSCRIPTION_MONTHS}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {months >= MIN_MONTHS_FOR_DISCOUNT && (
            <div className="flex items-center gap-2 mt-3 text-sm text-green-600 dark:text-green-400">
              <Tag className="size-4" />
              {MULTI_MONTH_DISCOUNT_RATE * 100}% discount applied for {months} months!
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {availablePlans.map((planKey) => {
          const planInfo = SUBSCRIPTION_PRICING[planKey];
          const isHigher = planOrder.indexOf(planKey) > planOrder.indexOf(currentPlan);
          const pricing = calculatePrice(planKey, months);

          return (
            <Card key={planKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isHigher ? (
                      <ArrowUp className="size-5 text-primary" />
                    ) : (
                      <ArrowDown className="size-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg">{planInfo.label}</CardTitle>
                  </div>
                  <Badge variant={isHigher ? 'default' : 'outline'}>
                    {isHigher ? 'Upgrade' : 'Downgrade'}
                  </Badge>
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
                    {pricing.total === 0 ? 'Free' : `$${formatPrice(pricing.total)}`}
                  </span>
                  {pricing.total > 0 && (
                    <span className="text-muted-foreground">/{months}mo</span>
                  )}
                  {pricing.hasDiscount && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ${formatPrice(pricing.monthlyRate)}/mo &middot; save {(MULTI_MONTH_DISCOUNT_RATE * 100).toFixed(0)}%
                    </p>
                  )}
                </div>

                {pricing.hasDiscount && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                    <Tag className="size-4" />
                    Save ${formatPrice(pricing.discountAmount)} ({(MULTI_MONTH_DISCOUNT_RATE * 100).toFixed(0)}% off)
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 px-3 py-2 text-center text-sm font-medium">
                  {(planInfo.platformFeeRate * 100).toFixed(0)}% transaction fee
                </div>

                <Separator />

                {isHigher && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h4 className="text-sm font-medium mb-2">What you get</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="size-4 text-primary" />
                        <span>{(planInfo.platformFeeRate * 100).toFixed(0)}% transaction fee</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="size-4 text-primary" />
                        <span>Up to {planInfo.maxMembers === Infinity ? '∞' : planInfo.maxMembers.toLocaleString()} members</span>
                      </li>
                      {pricing.hasDiscount && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="size-4 text-green-600 dark:text-green-400" />
                          <span>Save ${formatPrice(pricing.discountAmount)} with {months}-month commitment</span>
                        </li>
                      )}
                      {planKey === 'enterprise' && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="size-4 text-primary" />
                          <span>Custom domain name</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {!isHigher && planKey === 'starter' && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h4 className="text-sm font-medium mb-2">Changes with Starter</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Transaction fee increases to 10%</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Member limit reduced to 500</span>
                      </li>
                    </ul>
                  </div>
                )}

                <Button
                  className="w-full"
                  variant={isHigher ? 'default' : 'outline'}
                  onClick={() => handlePlanChange(planKey)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : isHigher ? (
                    <Crown className="mr-2 size-4" />
                  ) : null}
                  {planKey === 'starter'
                    ? 'Downgrade to Starter'
                    : `Pay $${formatPrice(pricing.total)}`
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <UpgradePageContent />
    </Suspense>
  );
}
