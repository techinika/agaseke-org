import { Timestamp } from 'firebase/firestore';
import { DonationFrequency } from '@/lib/constants';

export interface Donation {
  id: string;
  orgId: string;
  userId: string | null;
  donorName: string;
  donorEmail: string | null;
  campaignId: string | null;
  amount: number;
  platformFee: number;
  orgReceives: number;
  depositId?: string;
  frequency: DonationFrequency;
  status: 'pending' | 'active' | 'cancelled' | 'completed';
  nextBillingDate: Timestamp | null;
  createdAt: Timestamp;
}
