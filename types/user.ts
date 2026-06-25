import { Timestamp } from 'firebase/firestore';
import { UserType } from '@/lib/constants';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  type: UserType;
  isAdmin?: boolean;
}
