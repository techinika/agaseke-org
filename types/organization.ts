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

  brandColor?: string;

  // Email/SMTP settings (optional — org can configure custom SMTP)
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
}
