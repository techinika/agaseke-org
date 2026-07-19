export interface SubscriptionPlanConfig {
  price: number;
  yearlyPrice: number;
  maxMembers: number;
  label: string;
  platformFeeRate: number;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig> = {
  starter: { price: 0, yearlyPrice: 0, maxMembers: 500, label: 'Starter', platformFeeRate: 0.10 },
  growth: { price: 99, yearlyPrice: 1010, maxMembers: 1000, label: 'Growth', platformFeeRate: 0.05 },
  enterprise: { price: 199, yearlyPrice: 2030, maxMembers: Infinity, label: 'Enterprise', platformFeeRate: 0.05 },
};

export const MULTI_MONTH_DISCOUNT_RATE = 0.10;
export const MIN_MONTHS_FOR_DISCOUNT = 5;
export const MAX_SUBSCRIPTION_MONTHS = 12;

export interface PriceBreakdown {
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

export function calculateSubscriptionPrice(planKey: string, months: number): PriceBreakdown {
  const plan = SUBSCRIPTION_PLANS[planKey];
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);

  const clampedMonths = Math.max(1, Math.min(MAX_SUBSCRIPTION_MONTHS, months));
  const monthlyRate = plan.price;
  const subtotal = monthlyRate * clampedMonths;
  const hasDiscount = clampedMonths >= MIN_MONTHS_FOR_DISCOUNT;
  const discountAmount = hasDiscount ? Math.round(subtotal * MULTI_MONTH_DISCOUNT_RATE * 100) / 100 : 0;
  const total = Math.round((subtotal - discountAmount) * 100) / 100;
  const perMonthEffective = clampedMonths > 0 ? Math.round((total / clampedMonths) * 100) / 100 : 0;

  return {
    plan: planKey,
    planLabel: plan.label,
    monthlyRate,
    months: clampedMonths,
    subtotal,
    discountRate: hasDiscount ? MULTI_MONTH_DISCOUNT_RATE : 0,
    discountAmount,
    total,
    hasDiscount,
    perMonthEffective,
  };
}

export function getSubscriptionEndDate(months: number): string {
  const end = new Date();
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
}
