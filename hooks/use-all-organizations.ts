import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Organization } from '@/types/organization';

export function useAllOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'all'],
    queryFn: () =>
      queryDocuments<Organization>(COLLECTIONS.ORGANIZATIONS),
  });
}
