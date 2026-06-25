'use client';

import { useParams } from 'next/navigation';
import { Bell, Calendar, Clock, Mail, RefreshCw, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { REMINDER_DAYS_BEFORE, MEMBERSHIP_GRACE_PERIOD_DAYS } from '@/lib/constants';

export default function RemindersPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { data: org, isLoading } = useOrganizationBySlug(slug);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Automated Reminders" description="Manage notification and scheduled tasks" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  const isAdmin = org.adminIds.includes(user?.uid ?? '');

  const cronJobs = [
    {
      title: 'Payment Reconciliation',
      description: 'Checks pending transactions against pawaPay and updates their status automatically.',
      icon: RefreshCw,
      schedule: 'Every 15 minutes',
      endpoint: '/api/cron/reconcile',
      enabled: true,
    },
    {
      title: 'Payment Reminders',
      description: `Sends email reminders ${REMINDER_DAYS_BEFORE} days before a membership renewal or recurring donation is due.`,
      icon: Bell,
      schedule: 'Daily at 08:00',
      endpoint: '/api/cron/payment-reminders',
      enabled: true,
    },
    {
      title: 'Membership Expiry',
      description: `Marks memberships as expired after their renewsAt date and notifies affected members. Includes a ${MEMBERSHIP_GRACE_PERIOD_DAYS}-day grace period.`,
      icon: Clock,
      schedule: 'Daily at 09:00',
      endpoint: '/api/cron/membership-expiry',
      enabled: true,
    },
  ];

  const emailNotifications = [
    {
      title: 'New Donation Receipt',
      description: 'Donors receive a receipt email when their donation is confirmed.',
      icon: DollarSign,
      type: 'Immediate',
    },
    {
      title: 'New Member Confirmation',
      description: 'Members receive a welcome email when their membership payment is confirmed.',
      icon: Users,
      type: 'Immediate',
    },
    {
      title: 'Admin — New Donation Alert',
      description: 'Organization admins are notified when a new donation is received.',
      icon: Mail,
      type: 'Immediate',
    },
    {
      title: 'Admin — New Member Alert',
      description: 'Organization admins are notified when a new member joins.',
      icon: Mail,
      type: 'Immediate',
    },
    {
      title: 'Payment Reminder',
      description: `Reminder email sent ${REMINDER_DAYS_BEFORE} days before a recurring payment is due.`,
      icon: Bell,
      type: `Daily (${REMINDER_DAYS_BEFORE} days before)`,
    },
    {
      title: 'Membership Expiry Notice',
      description: 'Notification sent when a membership expires and access is revoked.',
      icon: Clock,
      type: 'Daily',
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automated Reminders"
        description="Scheduled tasks and email notifications for your organization"
      />

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Only administrators can view and configure reminders.
        </p>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Scheduled Tasks</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cronJobs.map((job) => {
            const Icon = job.icon;
            return (
              <Card key={job.title} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {job.schedule}
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-sm">{job.title}</CardTitle>
                  <CardDescription className="text-xs">{job.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${job.enabled ? 'bg-green-500' : 'bg-muted-foreground'}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {job.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Email Notifications</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {emailNotifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <Card key={notif.title}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{notif.type}</span>
                  </div>
                  <CardTitle className="mt-3 text-sm">{notif.title}</CardTitle>
                  <CardDescription className="text-xs">{notif.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Instructions</CardTitle>
          <CardDescription>
            How to configure cron jobs for automated reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            These automated tasks run via API endpoints that need to be called by an external
            cron service (e.g., cron-job.org, Vercel Cron Jobs, or your own server cron).
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs space-y-1">
            <p># Set this env var to secure your cron endpoints:</p>
            <p className="text-primary">CRON_SECRET=your-secret-token</p>
            <p className="mt-2"># Then configure these cron jobs in your scheduler:</p>
            <p><span className="text-green-500">*/15 * * * *</span> GET /api/cron/reconcile</p>
            <p><span className="text-green-500">0 8 * * *</span>   GET /api/cron/payment-reminders</p>
            <p><span className="text-green-500">0 9 * * *</span>   GET /api/cron/membership-expiry</p>
          </div>
          <p>
            Each request must include the header: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer your-secret-token</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
