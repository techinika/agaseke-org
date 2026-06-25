import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { Campaign } from '@/types/campaign';
import { orderBy, where } from 'firebase/firestore';

function campaignsPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${SUBCOLLECTIONS.CAMPAIGNS}`;
}

export function useCampaigns(orgId: string) {
  return useQuery({
    queryKey: ['campaigns', orgId],
    queryFn: () =>
      queryDocuments<Campaign>(campaignsPath(orgId), orderBy('createdAt', 'desc')),
    enabled: !!orgId,
  });
}

export function useCampaign(orgId: string, campaignId: string) {
  return useQuery({
    queryKey: ['campaign', orgId, campaignId],
    queryFn: () =>
      queryDocuments<Campaign>(campaignsPath(orgId)).then((docs) =>
        docs.find((d) => d.id === campaignId) ?? null
      ),
    enabled: !!orgId && !!campaignId,
  });
}

export function useActiveCampaigns(orgId: string) {
  return useQuery({
    queryKey: ['campaigns', orgId, 'active'],
    queryFn: () =>
      queryDocuments<Campaign>(
        campaignsPath(orgId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      ),
    enabled: !!orgId,
  });
}

export function useCreateCampaign(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Campaign, 'id'>) =>
      addDocument(campaignsPath(orgId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
    },
  });
}

export function useUpdateCampaign(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: string; data: Partial<Campaign> }) => {
      await updateDocument(`${campaignsPath(orgId)}/${campaignId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
    },
  });
}

export function useDeleteCampaign(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) =>
      deleteDocument(`${campaignsPath(orgId)}/${campaignId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
    },
  });
}
