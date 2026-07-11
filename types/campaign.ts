import { Timestamp } from 'firebase/firestore';
import { PlatformFeePayer } from '@/lib/constants';

export type WithdrawalTrigger = 'target_reached' | 'anytime';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  coverURL: string | null;
  startDate: Timestamp;
  endDate: Timestamp | null;
  isActive: boolean;
  createdAt: Timestamp;
  platformFeePayer: PlatformFeePayer;
  withdrawalTrigger: WithdrawalTrigger;
}
