import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Invitation } from '@/types/invitation';
import { where, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';

export function usePendingInvitations(email: string | undefined) {
  return useQuery({
    queryKey: ['invitations', 'pending', email],
    queryFn: () =>
      queryDocuments<Invitation>(
        COLLECTIONS.INVITATIONS,
        where('email', '==', email),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      ),
    enabled: !!email,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitation, userUid }: { invitation: Invitation; userUid: string }) => {
      const adminsPath = `${COLLECTIONS.ORGANIZATIONS}/${invitation.orgId}/admins`;
      const orgPath = `${COLLECTIONS.ORGANIZATIONS}/${invitation.orgId}`;

      // 1. Update invitation status
      await updateDocument(`${COLLECTIONS.INVITATIONS}/${invitation.id}`, { status: 'accepted' });

      // 2. Find the pending admin doc and update UID to real UID
      const adminDocs = await queryDocuments<{ id: string; uid: string }>(
        adminsPath,
        where('email', '==', invitation.email)
      );
      const pendingAdmin = adminDocs.find((a) => a.uid.startsWith('pending_'));
      if (pendingAdmin) {
        await updateDocument(`${adminsPath}/${pendingAdmin.id}`, { uid: userUid });
      }

      // 3. Add real UID to adminIds on org doc
      await updateDocument(orgPath, { adminIds: arrayUnion(userUid) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['orgAdmins'] });
    },
  });
}

export function useRejectInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitation: Invitation) => {
      const adminsPath = `${COLLECTIONS.ORGANIZATIONS}/${invitation.orgId}/admins`;

      // 1. Delete the invitation doc
      await deleteDocument(`${COLLECTIONS.INVITATIONS}/${invitation.id}`);

      // 2. Delete the pending admin doc
      const adminDocs = await queryDocuments<{ id: string; uid: string }>(
        adminsPath,
        where('email', '==', invitation.email)
      );
      const pendingAdmin = adminDocs.find((a) => a.uid.startsWith('pending_'));
      if (pendingAdmin) {
        await deleteDocument(`${adminsPath}/${pendingAdmin.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
