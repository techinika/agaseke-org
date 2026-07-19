import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { OrgAdmin } from '@/types/admin';
import { orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';

const ADMINS = 'admins';

function adminsPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${ADMINS}`;
}

function orgPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}`;
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
    mutationFn: async (data: Omit<OrgAdmin, 'id'>) => {
      await addDocument(adminsPath(orgId), data);
      await updateDocument(orgPath(orgId), { adminIds: arrayUnion(data.uid) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgAdmins', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
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
    mutationFn: async ({ adminId, uid }: { adminId: string; uid: string }) => {
      await deleteDocument(`${adminsPath(orgId)}/${adminId}`);
      await updateDocument(orgPath(orgId), { adminIds: arrayRemove(uid) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgAdmins', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
    },
  });
}
