import { Timestamp } from 'firebase/firestore';
import { OrgStatus } from '@/lib/constants';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoURL: string | null;
  coverURL: string | null;
  adminIds: string[];
  createdAt: Timestamp;
  status: OrgStatus;
  country: string;
  category: string;
}
