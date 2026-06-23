'use client';

import { PlaceholderPage } from '@/components/shared/placeholder-page';
import { Bell } from 'lucide-react';

export default function RemindersPage() {
  return (
    <PlaceholderPage
      title="Membership Reminders"
      description="Configure automatic renewal reminder emails"
      icon={Bell}
    />
  );
}
