import { Timestamp } from 'firebase/firestore';

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Withdrawal {
  id: string;
  orgId: string;
  amount: number;
  status: WithdrawalStatus;
  requestedBy: string;
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  failureReason?: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    swiftCode: string;
    bankAddress: string;
  };
}
