import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Transaction } from '@/types/transaction';
import { where, orderBy } from 'firebase/firestore';

export function useTransactions(orgId: string) {
  return useQuery({
    queryKey: ['transactions', orgId],
    queryFn: () =>
      queryDocuments<Transaction>(
        COLLECTIONS.TRANSACTIONS,
        where('orgId', '==', orgId),
        orderBy('createdAt', 'desc')
      ),
    enabled: !!orgId,
  });
}
