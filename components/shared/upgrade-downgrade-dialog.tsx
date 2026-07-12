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
import { Check, ArrowUp, ArrowDown, Loader2, Crown } from 'lucide-react';
import { SUBSCRIPTION_PRICING, type SubscriptionPlan, type SubscriptionBillingCycle } from '@/lib/constants';
import { toast } from 'sonner';

interface UpgradeDowngradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: SubscriptionPlan;
  targetPlan: SubscriptionPlan;
  billingCycle?: SubscriptionBillingCycle;
  onConfirm: () => Promise<void>;
}

const planOrder: SubscriptionPlan[] = ['starter', 'growth', 'enterprise'];

export function UpgradeDowngradeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  billingCycle = 'monthly',
  onConfirm,
}: UpgradeDowngradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const isUpgrade = planOrder.indexOf(targetPlan) > planOrder.indexOf(currentPlan);
  const current = SUBSCRIPTION_PRICING[currentPlan];
  const target = SUBSCRIPTION_PRICING[targetPlan];
  const currentPrice = billingCycle === 'yearly' ? current.yearlyPrice : current.price;
  const targetPrice = billingCycle === 'yearly' ? target.yearlyPrice : target.price;
  const priceSuffix = billingCycle === 'yearly' ? '/yr' : '/mo';

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
              {currentPrice === 0 ? 'Free' : `$${currentPrice}${priceSuffix}`}
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
              {targetPrice === 0 ? 'Free' : `$${targetPrice}${priceSuffix}`}
            </Badge>
          </div>

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
                {billingCycle === 'yearly' && target.yearlyPrice > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-green-600 dark:text-green-400" />
                    <span>Save {((1 - target.yearlyPrice / (target.price * 12)) * 100).toFixed(0)}% with yearly billing</span>
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
            {isUpgrade ? 'Upgrade' : 'Downgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
