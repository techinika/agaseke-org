import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
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
