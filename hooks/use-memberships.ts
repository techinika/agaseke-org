import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Membership } from '@/types/membership';
import { where, orderBy } from 'firebase/firestore';

export function useMemberships(orgId: string) {
  return useQuery({
    queryKey: ['memberships', orgId],
    queryFn: () =>
      queryDocuments<Membership>(
        COLLECTIONS.MEMBERSHIPS,
        where('orgId', '==', orgId),
        orderBy('createdAt', 'desc')
      ),
    enabled: !!orgId,
  });
}

export function useUserMembership(orgId: string, userId: string) {
  return useQuery({
    queryKey: ['membership', orgId, userId],
    queryFn: async () => {
      const memberships = await queryDocuments<Membership>(
        COLLECTIONS.MEMBERSHIPS,
        where('orgId', '==', orgId),
        where('userId', '==', userId)
      );
      return memberships[0] ?? null;
    },
    enabled: !!orgId && !!userId,
  });
}

export function useCreateMembership(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Membership, 'id'>) => {
      return addDocument(COLLECTIONS.MEMBERSHIPS, { ...data, orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', orgId] });
    },
  });
}

export function useUpdateMembership(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId, data }: { membershipId: string; data: Partial<Membership> }) => {
      return updateDocument(`${COLLECTIONS.MEMBERSHIPS}/${membershipId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', orgId] });
    },
  });
}
