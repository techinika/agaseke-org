import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Withdrawal } from '@/types/withdrawal';
import { orderBy, where } from 'firebase/firestore';

const WITHDRAWALS = 'withdrawals';

function withdrawalsPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${WITHDRAWALS}`;
}

export function useWithdrawals(orgId: string) {
  return useQuery({
    queryKey: ['withdrawals', orgId],
    queryFn: () =>
      queryDocuments<Withdrawal>(withdrawalsPath(orgId), orderBy('requestedAt', 'desc')),
    enabled: !!orgId,
  });
}

export function usePendingWithdrawals(orgId: string) {
  return useQuery({
    queryKey: ['withdrawals', orgId, 'pending'],
    queryFn: () =>
      queryDocuments<Withdrawal>(
        withdrawalsPath(orgId),
        where('status', 'in', ['pending', 'processing'])
      ),
    enabled: !!orgId,
  });
}

export function useRequestWithdrawal(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Withdrawal, 'id' | 'status' | 'processedAt' | 'completedAt' | 'failureReason'>) =>
      addDocument(withdrawalsPath(orgId), { ...data, status: 'pending' as const }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals', orgId] });
    },
  });
}

export function useUpdateWithdrawal(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ withdrawalId, data }: { withdrawalId: string; data: Partial<Withdrawal> }) => {
      await updateDocument(`${withdrawalsPath(orgId)}/${withdrawalId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals', orgId] });
    },
  });
}
