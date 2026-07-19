'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowUp, ArrowDown, Loader2, Crown, Tag, Minus, Plus } from 'lucide-react';
import {
  SUBSCRIPTION_PRICING,
  type SubscriptionPlan,
  MULTI_MONTH_DISCOUNT_RATE,
  MIN_MONTHS_FOR_DISCOUNT,
  MAX_SUBSCRIPTION_MONTHS,
} from '@/lib/constants';
import { toast } from 'sonner';

interface UpgradeDowngradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: SubscriptionPlan;
  targetPlan: SubscriptionPlan;
  months?: number;
  onMonthsChange?: (months: number) => void;
  onConfirm: () => Promise<void>;
}

const planOrder: SubscriptionPlan[] = ['starter', 'growth', 'enterprise'];

function formatPrice(price: number): string {
  return price % 1 === 0 ? price.toString() : price.toFixed(2);
}

export function UpgradeDowngradeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  months: controlledMonths,
  onMonthsChange,
  onConfirm,
}: UpgradeDowngradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [internalMonths, setInternalMonths] = useState(1);
  const months = controlledMonths ?? internalMonths;
  const setMonths = onMonthsChange || setInternalMonths;

  const isUpgrade = planOrder.indexOf(targetPlan) > planOrder.indexOf(currentPlan);
  const current = SUBSCRIPTION_PRICING[currentPlan];
  const target = SUBSCRIPTION_PRICING[targetPlan];

  const monthlyRate = target.price;
  const subtotal = monthlyRate * months;
  const hasDiscount = months >= MIN_MONTHS_FOR_DISCOUNT;
  const discountAmount = hasDiscount ? Math.round(subtotal * MULTI_MONTH_DISCOUNT_RATE * 100) / 100 : 0;
  const total = Math.round((subtotal - discountAmount) * 100) / 100;
  const perMonthEffective = months > 0 ? Math.round((total / months) * 100) / 100 : 0;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      toast.success(`Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${target.label} plan`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to change plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <ArrowUp className="size-5 text-primary" />
            ) : (
              <ArrowDown className="size-5 text-muted-foreground" />
            )}
            {isUpgrade ? 'Upgrade' : 'Downgrade'} Plan
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? 'Upgrade your plan to unlock more features and member capacity.'
              : 'Downgrade your plan. Some features may become unavailable.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="font-medium">{current.label}</p>
            </div>
            <Badge variant="outline">
              {current.price === 0 ? 'Free' : `$${current.price}/mo`}
            </Badge>
          </div>

          <div className="flex items-center justify-center">
            <div className="rounded-full bg-muted p-2">
              {isUpgrade ? (
                <ArrowUp className="size-4 text-primary" />
              ) : (
                <ArrowDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary p-4">
            <div>
              <p className="text-sm text-muted-foreground">New plan</p>
              <p className="font-medium">{target.label}</p>
            </div>
            <Badge variant="default">
              {target.price === 0 ? 'Free' : `$${target.price}/mo`}
            </Badge>
          </div>

          {/* Month Selector */}
          {targetPlan !== 'starter' && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Subscription duration</p>
                <span className="text-sm text-muted-foreground">{months} month{months > 1 ? 's' : ''}</span>
              </div>
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
            </div>
          )}

          {/* Price Breakdown */}
          {targetPlan !== 'starter' && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly rate</span>
                <span>${formatPrice(monthlyRate)}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({months} month{months > 1 ? 's' : ''})</span>
                <span>${formatPrice(subtotal)}</span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Multi-month discount (10%)</span>
                  <span>-${formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span className="text-lg">${formatPrice(total)}</span>
              </div>
              {hasDiscount && (
                <div className="text-xs text-muted-foreground text-right">
                  ${formatPrice(perMonthEffective)}/mo effective
                </div>
              )}
            </div>
          )}

          {isUpgrade && (
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium">What you get with {target.label}</h4>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-primary" />
                  <span>{(target.platformFeeRate * 100).toFixed(0)}% transaction fee</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-primary" />
                  <span>Up to {target.maxMembers === Infinity ? '∞' : target.maxMembers.toLocaleString()} members</span>
                </li>
                {hasDiscount && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 dark:text-green-400" />
                    <span>Save ${(discountAmount).toFixed(2)} with {months}-month commitment</span>
                  </li>
                )}
                {targetPlan === 'enterprise' && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    <span>Custom domain name</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {!isUpgrade && targetPlan === 'starter' && (
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium">Changes with Starter plan</h4>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Transaction fee increases to 10%</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Member limit reduced to 500</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : isUpgrade ? (
              <Crown className="mr-2 size-4" />
            ) : null}
            {targetPlan === 'starter'
              ? 'Downgrade'
              : `Pay $${formatPrice(total)}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
