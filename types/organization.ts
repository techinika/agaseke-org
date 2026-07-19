import { Timestamp } from 'firebase/firestore';
import { SubscriptionBillingCycle, OrgStatus, SubscriptionPlan } from '@/lib/constants';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoURL: string | null;
  coverURL: string | null;
  adminIds: string[];
  createdAt: Timestamp;
  status: OrgStatus;
  country: string;
  category: string;

  brandColor?: string;

  // Subscription settings
  subscriptionPlan: SubscriptionPlan;
  subscriptionBillingCycle?: SubscriptionBillingCycle;
  subscriptionMonths?: number;
  subscriptionStartDate?: Timestamp;
  subscriptionEndDate?: Timestamp;

  // Email/SMTP settings (optional — org can configure custom SMTP)
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;

  // Payout settings (org bank details for receiving funds)
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  swiftCode?: string;
  bankAddress?: string;

  // Branding settings (for emails and public pages)
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  footerText?: string;
}
