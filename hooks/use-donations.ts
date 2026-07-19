import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Donation } from '@/types/donation';
import { where, orderBy } from 'firebase/firestore';

export function useDonations(orgId: string) {
  return useQuery({
    queryKey: ['donations', orgId],
    queryFn: () =>
      queryDocuments<Donation>(
        COLLECTIONS.DONATIONS,
        where('orgId', '==', orgId),
        orderBy('createdAt', 'desc')
      ),
    enabled: !!orgId,
  });
}

export function useCreateDonation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Donation, 'id'>) =>
      addDocument(COLLECTIONS.DONATIONS, { ...data, orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations', orgId] });
    },
  });
}
