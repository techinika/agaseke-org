import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { OrgAdmin } from '@/types/admin';
import { orderBy } from 'firebase/firestore';

const ADMINS = 'admins';

function adminsPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${ADMINS}`;
}

export function useOrgAdmins(orgId: string) {
  return useQuery({
    queryKey: ['orgAdmins', orgId],
    queryFn: () =>
      queryDocuments<OrgAdmin>(adminsPath(orgId), orderBy('addedAt', 'desc')),
    enabled: !!orgId,
  });
}

export function useAddOrgAdmin(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<OrgAdmin, 'id'>) =>
      addDocument(adminsPath(orgId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgAdmins', orgId] });
    },
  });
}

export function useUpdateOrgAdmin(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adminId, data }: { adminId: string; data: Partial<OrgAdmin> }) => {
      await updateDocument(`${adminsPath(orgId)}/${adminId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgAdmins', orgId] });
    },
  });
}

export function useRemoveOrgAdmin(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adminId: string) =>
      deleteDocument(`${adminsPath(orgId)}/${adminId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgAdmins', orgId] });
    },
  });
}
