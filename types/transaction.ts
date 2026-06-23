import { Timestamp } from 'firebase/firestore';
import { TxnStatus, TxnType, PaymentMethod } from '@/lib/constants';

export interface Transaction {
  id: string;
  orgId: string;
  userId: string | null;
  amount: number;
  platformFee: number;
  orgReceives: number;
  currency: string;
  type: TxnType;
  referenceId: string;
  depositId: string;
  status: TxnStatus;
  paymentMethod: PaymentMethod;
  createdAt: Timestamp;
}
