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
    mutationFn: async (data: Omit<OrgAdmin, 'id'> & { orgName?: string; orgSlug?: string }) => {
      await addDocument(adminsPath(orgId), data);
      await updateDocument(orgPath(orgId), { adminIds: arrayUnion(data.uid) });

      // Create invitation doc for pending admins (user doesn't have an account yet)
      if (data.uid.startsWith('pending_')) {
        await addDocument(COLLECTIONS.INVITATIONS, {
          email: data.email,
          orgId,
          orgName: data.orgName || '',
          orgSlug: data.orgSlug || '',
          role: data.role,
          status: 'pending',
          invitedBy: data.addedBy,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgAdmins', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
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
    mutationFn: async ({ adminId, uid, email }: { adminId: string; uid: string; email?: string }) => {
      await deleteDocument(`${adminsPath(orgId)}/${adminId}`);
      await updateDocument(orgPath(orgId), { adminIds: arrayRemove(uid) });

      // Also delete pending invitation if it exists
      if (uid.startsWith('pending_') && email) {
        const invitations = await queryDocuments<{ id: string; email: string }>(
          COLLECTIONS.INVITATIONS,
          orderBy('createdAt', 'desc')
        );
        const invitation = invitations.find((i) => i.email === email);
        if (invitation) {
          await deleteDocument(`${COLLECTIONS.INVITATIONS}/${invitation.id}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgAdmins', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}
