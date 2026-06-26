import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Organization } from '@/types/organization';
import { where } from 'firebase/firestore';

export function useUserOrganizations(userId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', 'user', userId],
    queryFn: () =>
      queryDocuments<Organization>(
        COLLECTIONS.ORGANIZATIONS,
        where('adminIds', 'array-contains', userId)
      ),
    enabled: !!userId,
  });
}
