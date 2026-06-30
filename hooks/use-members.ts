import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { OrgMember } from '@/types/membership';
import { orderBy, where, QueryConstraint } from 'firebase/firestore';

function membersPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${SUBCOLLECTIONS.MEMBERS}`;
}

export function useOrgMembers(orgId: string, statusFilter?: string) {
  return useQuery({
    queryKey: ['org-members', orgId, statusFilter ?? 'all'],
    queryFn: () => {
      const constraints: QueryConstraint[] = [orderBy('joinedAt', 'desc')];
      if (statusFilter) constraints.unshift(where('status', '==', statusFilter));
      return queryDocuments<OrgMember>(membersPath(orgId), ...constraints);
    },
    enabled: !!orgId,
  });
}

export function useOrgMember(orgId: string, userId: string) {
  return useQuery({
    queryKey: ['org-member', orgId, userId],
    queryFn: async () => {
      const members = await queryDocuments<OrgMember>(
        membersPath(orgId),
        where('userId', '==', userId),
        orderBy('joinedAt', 'desc')
      );
      return members[0] ?? null;
    },
    enabled: !!orgId && !!userId,
  });
}
