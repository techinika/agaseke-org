import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument, deleteDocument, setDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { Tier } from '@/types/membership';
import { orderBy, where } from 'firebase/firestore';

function tiersPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${SUBCOLLECTIONS.TIERS}`;
}

export function useTiers(orgId: string) {
  return useQuery({
    queryKey: ['tiers', orgId],
    queryFn: () =>
      queryDocuments<Tier>(tiersPath(orgId), orderBy('order', 'asc')),
    enabled: !!orgId,
  });
}

export function useActiveTiers(orgId: string) {
  return useQuery({
    queryKey: ['tiers', orgId, 'active'],
    queryFn: () =>
      queryDocuments<Tier>(tiersPath(orgId), where('isActive', '==', true), orderBy('order', 'asc')),
    enabled: !!orgId,
  });
}

export function useCreateTier(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Tier, 'id'>) => {
      const path = tiersPath(orgId);
      return addDocument(path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiers', orgId] });
    },
  });
}

export function useUpdateTier(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tierId, data }: { tierId: string; data: Partial<Tier> }) => {
      const path = `${tiersPath(orgId)}/${tierId}`;
      return updateDocument(path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiers', orgId] });
    },
  });
}

export function useDeleteTier(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tierId: string) => {
      const path = `${tiersPath(orgId)}/${tierId}`;
      return deleteDocument(path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiers', orgId] });
    },
  });
}

export function useReorderTiers(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tiers: { id: string; order: number }[]) => {
      const promises = tiers.map((t) =>
        setDocument(`${tiersPath(orgId)}/${t.id}`, { order: t.order })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiers', orgId] });
    },
  });
}
