import { Timestamp } from 'firebase/firestore';
import { AdminRole } from './admin';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface Invitation {
  id: string;
  email: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: AdminRole;
  status: InvitationStatus;
  invitedBy: string;
  createdAt: Timestamp;
}
