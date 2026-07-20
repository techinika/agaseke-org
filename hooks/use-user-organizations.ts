import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Organization } from '@/types/organization';
import { where } from 'firebase/firestore';

export type OrgWithRole = Organization & { userRole: 'admin' | 'member' };

export function useUserOrganizations(userId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', 'user', userId],
    queryFn: async () => {
      const [adminOrgs, memberOrgs] = await Promise.all([
        queryDocuments<Organization>(
          COLLECTIONS.ORGANIZATIONS,
          where('adminIds', 'array-contains', userId)
        ),
        queryDocuments<Organization>(
          COLLECTIONS.ORGANIZATIONS,
          where('memberIds', 'array-contains', userId)
        ),
      ]);

      const orgMap = new Map<string, OrgWithRole>();
      for (const org of adminOrgs) {
        orgMap.set(org.id, { ...org, userRole: 'admin' });
      }
      for (const org of memberOrgs) {
        if (!orgMap.has(org.id)) {
          orgMap.set(org.id, { ...org, userRole: 'member' });
        }
      }

      return Array.from(orgMap.values());
    },
    enabled: !!userId,
  });
}
