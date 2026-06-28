import { Timestamp } from 'firebase/firestore';
import { MembershipStatus, BillingCycle, PlatformFeePayer } from '@/lib/constants';

export interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: BillingCycle;
  benefits: string[];
  roomAccess: string[];
  isActive: boolean;
  order: number;
  platformFeePayer: PlatformFeePayer;
}

export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  tierId: string;
  status: MembershipStatus;
  startDate: Timestamp;
  renewsAt: Timestamp | null;
  autoRenew: boolean;
  depositId?: string;
  createdAt: Timestamp;
}

export interface OrgMember {
  userId: string;
  membershipId: string;
  tierId: string;
  status?: string;
  depositId?: string;
  joinedAt: Timestamp;
  displayName: string;
  photoURL: string | null;
}
