import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument } from '@/lib/firebase/firestore';
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

export function useCreateTransaction(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Transaction, 'id'>) =>
      addDocument(COLLECTIONS.TRANSACTIONS, { ...data, orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', orgId] });
    },
  });
}
