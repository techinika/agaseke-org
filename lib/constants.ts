export const COLLECTIONS = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  TRANSACTIONS: 'transactions',
  DONATIONS: 'donations',
  MEMBERSHIPS: 'memberships',
} as const;

export const SUBCOLLECTIONS = {
  TIERS: 'tiers',
  CAMPAIGNS: 'campaigns',
  ROOMS: 'rooms',
  MESSAGES: 'messages',
  MEMBERS: 'members',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  VERIFY_EMAIL: '/auth/verify-email',
  MY_ORGANIZATIONS: '/org',
  ORG_CREATE: '/org/create',
  ORG_DASHBOARD: (slug: string) => `/org/${slug}/dashboard`,
  ORG_MEMBERS: (slug: string) => `/org/${slug}/members`,
  ORG_DONATIONS: (slug: string) => `/org/${slug}/donations`,
  ORG_CAMPAIGNS: (slug: string) => `/org/${slug}/campaigns`,
  ORG_FINANCE: (slug: string) => `/org/${slug}/finance`,
  ORG_SETTINGS: (slug: string) => `/org/${slug}/settings`,
  ORG_ROOMS: (slug: string) => `/org/${slug}/rooms`,
  ORG_JOIN: (slug: string) => `/org/${slug}/join`,
  ORG_DONATE: (slug: string) => `/org/${slug}/donate`,
  ADMIN_ORGANIZATIONS: '/admin/organizations',
} as const;

export const USER_TYPES = ['org_admin', 'member', 'donor'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const ORG_STATUSES = ['active', 'inactive'] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export const SUBSCRIPTION_PLANS = ['starter', 'growth', 'enterprise'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_PRICING = {
  starter: { price: 0, yearlyPrice: 0, maxMembers: 500, label: 'Starter', platformFeeRate: 0.10 },
  growth: { price: 99, yearlyPrice: 1010, maxMembers: 1000, label: 'Growth', platformFeeRate: 0.05 },
  enterprise: { price: 199, yearlyPrice: 2030, maxMembers: Infinity, label: 'Enterprise', platformFeeRate: 0.05 },
} as const;

export const SUBSCRIPTION_BILLING_CYCLES = ['monthly', 'yearly'] as const;
export type SubscriptionBillingCycle = (typeof SUBSCRIPTION_BILLING_CYCLES)[number];

export const YEARLY_DISCOUNT_RATE = 0.15;

export const TXN_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;
export type TxnStatus = (typeof TXN_STATUSES)[number];

export const TXN_TYPES = ['donation', 'membership', 'subscription'] as const;
export type TxnType = (typeof TXN_TYPES)[number];

export const PAYMENT_METHODS = ['pesapal_card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MEMBERSHIP_STATUSES = ['active', 'expired', 'cancelled', 'pending', 'failed'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const BILLING_CYCLES = ['monthly', 'annual', 'one_time'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const DONATION_FREQUENCIES = ['one_time', 'monthly', 'annual'] as const;
export type DonationFrequency = (typeof DONATION_FREQUENCIES)[number];

export const ROOM_TYPES = ['general', 'members_only', 'tier_restricted'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const PLATFORM_FEE_PAYERS = ['org', 'donor'] as const;
export type PlatformFeePayer = (typeof PLATFORM_FEE_PAYERS)[number];

export const CURRENCY = 'USD';
export const CURRENCY_SYMBOL = '$';

export const CATEGORIES = [
  { value: 'NGO', label: 'NGO' },
  { value: 'Association', label: 'Association' },
  { value: 'Church', label: 'Church' },
  { value: 'School', label: 'School' },
  { value: 'Cooperative', label: 'Cooperative' },
  { value: 'Foundation', label: 'Foundation' },
  { value: 'Other', label: 'Other' },
] as const;

export const COUNTRIES = [
  { value: 'RW', label: 'Rwanda' },
  { value: 'UG', label: 'Uganda' },
  { value: 'KE', label: 'Kenya' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'BI', label: 'Burundi' },
  { value: 'CD', label: 'DR Congo' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'ET', label: 'Ethiopia' },
] as const;

// Email / Reminders
export const REMINDER_DAYS_BEFORE = 3;
export const MEMBERSHIP_GRACE_PERIOD_DAYS = 7;

// Withdrawal
export const MIN_WITHDRAWAL_AMOUNT = 10;
