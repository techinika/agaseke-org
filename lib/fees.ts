import { SUBSCRIPTION_PRICING, type PlatformFeePayer, type SubscriptionPlan } from './constants';

export interface FeeBreakdown {
  totalToPay: number;
  platformFee: number;
  orgReceives: number;
}

export function calculateFee(amount: number, feePayer: PlatformFeePayer, plan: SubscriptionPlan = 'starter'): FeeBreakdown {
  const feeRate = SUBSCRIPTION_PRICING[plan].platformFeeRate;
  if (feePayer === 'org') {
    const totalToPay = amount;
    const platformFee = Math.round(amount * feeRate);
    const orgReceives = amount - platformFee;
    return { totalToPay, platformFee, orgReceives };
  }
  const orgReceives = amount;
  const totalToPay = Math.ceil(amount / (1 - feeRate));
  const platformFee = totalToPay - orgReceives;
  return { totalToPay, platformFee, orgReceives };
}

export function getPlatformFeeRate(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PRICING[plan].platformFeeRate;
}
