import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocument, updateDocument, queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Organization } from '@/types/organization';
import { where } from 'firebase/firestore';

export function useOrganization(orgId: string) {
  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => getDocument<Organization>(`${COLLECTIONS.ORGANIZATIONS}/${orgId}`),
    enabled: !!orgId,
  });
}

export function useOrganizationBySlug(slug: string) {
  return useQuery({
    queryKey: ['organization-slug', slug],
    queryFn: async () => {
      const orgs = await queryDocuments<Organization>(
        COLLECTIONS.ORGANIZATIONS,
        where('slug', '==', slug)
      );
      return orgs[0] ?? null;
    },
    enabled: !!slug,
  });
}

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Organization>) => {
      return updateDocument(`${COLLECTIONS.ORGANIZATIONS}/${orgId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization-slug'] });
    },
  });
}
