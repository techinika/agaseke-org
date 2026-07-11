export type AdminRole = 'super-admin' | 'finance-admin' | 'community-admin';

export interface OrgAdmin {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  addedAt: Date;
  addedBy: string;
}

export const ADMIN_ROLES: { value: AdminRole; label: string; description: string }[] = [
  { value: 'super-admin', label: 'Super Admin', description: 'Full access to all features and settings' },
  { value: 'finance-admin', label: 'Finance Admin', description: 'Access to finance, donations, and reports' },
  { value: 'community-admin', label: 'Community Admin', description: 'Access to members and member engagement' },
];
