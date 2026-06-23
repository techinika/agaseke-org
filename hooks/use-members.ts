import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { OrgMember } from '@/types/membership';
import { orderBy } from 'firebase/firestore';

function membersPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${SUBCOLLECTIONS.MEMBERS}`;
}

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () =>
      queryDocuments<OrgMember>(membersPath(orgId), orderBy('joinedAt', 'desc')),
    enabled: !!orgId,
  });
}

export function useOrgMember(orgId: string, userId: string) {
  return useQuery({
    queryKey: ['org-member', orgId, userId],
    queryFn: async () => {
      const members = await queryDocuments<OrgMember>(
        membersPath(orgId),
        orderBy('joinedAt', 'desc')
      );
      return members.find((m) => m.userId === userId) ?? null;
    },
    enabled: !!orgId && !!userId,
  });
}
