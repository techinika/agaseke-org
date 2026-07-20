import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { OrgMember } from '@/types/membership';
import { orderBy, where, QueryConstraint, arrayUnion } from 'firebase/firestore';

function membersPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${SUBCOLLECTIONS.MEMBERS}`;
}

function orgPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}`;
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

export function useCreateOrgMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<OrgMember, 'joinedAt'> & { joinedAt?: OrgMember['joinedAt'] }) => {
      await addDocument(membersPath(orgId), {
        ...data,
        ...('joinedAt' in data ? {} : { joinedAt: new Date() }),
      });
      // Track member on org doc so /org page can query member orgs
      await updateDocument(orgPath(orgId), { memberIds: arrayUnion(data.userId) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
