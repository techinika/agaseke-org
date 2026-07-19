'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Crown, Users, ArrowUp, ArrowDown, Loader2, CreditCard, AlertTriangle, Tag } from 'lucide-react';
import { SUBSCRIPTION_PRICING, type SubscriptionPlan, MULTI_MONTH_DISCOUNT_RATE, MIN_MONTHS_FOR_DISCOUNT } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';
import { WORKERS } from '@/lib/workers';

const planOrder: SubscriptionPlan[] = ['starter', 'growth', 'enterprise'];

const planColors: Record<SubscriptionPlan, string> = {
  starter: 'bg-muted text-muted-foreground',
  growth: 'bg-primary/10 text-primary',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function formatPrice(price: number): string {
  return price % 1 === 0 ? price.toString() : price.toFixed(2);
}

interface PriceBreakdown {
  plan: string;
  planLabel: string;
  monthlyRate: number;
  months: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  hasDiscount: boolean;
  perMonthEffective: number;
}

export default function SubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuthStore();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('starter');
  const [currentMonths, setCurrentMonths] = useState(1);
  const [currentEndDate, setCurrentEndDate] = useState<string>('');
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(1);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch(`${WORKERS.subscriptions.url}/get-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': WORKERS.subscriptions.apiKey,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ slug }),
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCurrentPlan(data.plan || 'starter');
          setCurrentMonths(data.months || 1);
          setCurrentEndDate(data.endDate || '');
          setMemberCount(data.pricing?.maxMembers ?? SUBSCRIPTION_PRICING[(data.plan as SubscriptionPlan) || 'starter'].maxMembers);
        }
      } catch {
        // Use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [slug, user]);

  const plan = SUBSCRIPTION_PRICING[currentPlan];
  const memberPercentage = Math.min((memberCount / plan.maxMembers) * 100, 100);
  const isNearLimit = memberPercentage >= 80;
  const isAtLimit = memberPercentage >= 100;

  function calculatePrice(planKey: SubscriptionPlan, selectedMonths: number): PriceBreakdown {
    const info = SUBSCRIPTION_PRICING[planKey];
    const monthlyRate = info.price;
    const subtotal = monthlyRate * selectedMonths;
    const hasDiscount = selectedMonths >= MIN_MONTHS_FOR_DISCOUNT;
    const discountAmount = hasDiscount ? Math.round(subtotal * MULTI_MONTH_DISCOUNT_RATE * 100) / 100 : 0;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const perMonthEffective = selectedMonths > 0 ? Math.round((total / selectedMonths) * 100) / 100 : 0;

    return {
      plan: planKey,
      planLabel: info.label,
      monthlyRate,
      months: selectedMonths,
      subtotal,
      discountRate: hasDiscount ? MULTI_MONTH_DISCOUNT_RATE : 0,
      discountAmount,
      total,
      hasDiscount,
      perMonthEffective,
    };
  }

  function handleUpgrade(target: SubscriptionPlan) {
    router.push(`/org/${slug}/subscription/upgrade?currentPlan=${currentPlan}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPricing = calculatePrice(currentPlan, currentMonths);

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
                <CardDescription>
                  {plan.label} plan &middot; {currentMonths} month{currentMonths > 1 ? 's' : ''}
                  {currentEndDate && (
                    <> &middot; expires {new Date(currentEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={planColors[currentPlan]}>
              {currentPricing.total === 0 ? 'Free' : `$${formatPrice(currentPricing.total)}/${currentMonths > 1 ? `${currentMonths}mo` : 'mo'}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Monthly rate</p>
              <p className="text-2xl font-bold">
                {currentPricing.monthlyRate === 0 ? 'Free' : `$${formatPrice(currentPricing.monthlyRate)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                per month
                {currentPricing.hasDiscount && (
                  <span className="ml-1 text-green-600 dark:text-green-400">
                    (${formatPrice(currentPricing.perMonthEffective)}/mo effective)
                  </span>
                )}
              </p>
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
          const displayPrice = calculatePrice(planKey, months);

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
                    {displayPrice.total === 0 ? 'Free' : `$${formatPrice(displayPrice.total)}`}
                  </span>
                  {displayPrice.total > 0 && (
                    <span className="text-muted-foreground">
                      /{months}mo
                    </span>
                  )}
                  {displayPrice.hasDiscount && planKey !== 'starter' && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ${formatPrice(displayPrice.monthlyRate)}/mo &middot; save {(MULTI_MONTH_DISCOUNT_RATE * 100).toFixed(0)}%
                    </p>
                  )}
                </div>

                {displayPrice.hasDiscount && planKey !== 'starter' && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                    <Tag className="size-4" />
                    Save ${formatPrice(displayPrice.discountAmount)} ({(MULTI_MONTH_DISCOUNT_RATE * 100).toFixed(0)}% off — {MIN_MONTHS_FOR_DISCOUNT}+ months)
                  </div>
                )}

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
                <p className="text-sm font-medium">Multi-month discount</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Save {(MULTI_MONTH_DISCOUNT_RATE * 100).toFixed(0)}% when you subscribe for {MIN_MONTHS_FOR_DISCOUNT}+ months at once
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
              <li>• Subscribe for {MIN_MONTHS_FOR_DISCOUNT}+ months to save {(MULTI_MONTH_DISCOUNT_RATE * 100).toFixed(0)}% on the subscription fee</li>
              <li>• Choose who pays the transaction fee: your organization or the donor</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
