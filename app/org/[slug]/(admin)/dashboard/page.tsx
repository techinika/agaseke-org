'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  Users,
  Heart,
  Megaphone,
  ArrowRight,
  Wallet,
  TrendingUp,
  CreditCard,
  UserPlus,
  DollarSign,
  Calendar,
  Target,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useOrgMembers } from '@/hooks/use-members';
import { useDonations } from '@/hooks/use-donations';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useCampaignDonationTotals } from '@/hooks/use-campaign-donations';
import { useTransactions } from '@/hooks/use-transactions';
import { CURRENCY_SYMBOL, CURRENCY } from '@/lib/constants';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function OrgDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';

  const { data: members, isLoading: membersLoading } = useOrgMembers(orgId);
  const { data: donations, isLoading: donationsLoading } = useDonations(orgId);
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(orgId);
  const { data: campaignTotals } = useCampaignDonationTotals(orgId);
  const { data: transactions, isLoading: txnLoading } = useTransactions(orgId);

  const isLoading = orgLoading || membersLoading || donationsLoading || campaignsLoading || txnLoading;

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthlyTxns = (transactions ?? []).filter((t) => {
      const d = t.createdAt?.toDate();
      return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const monthlyRevenue = monthlyTxns
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRevenue = (transactions ?? [])
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const newMembersThisMonth = (members ?? []).filter((m) => {
      const d = m.joinedAt?.toDate();
      return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    return {
      memberCount: members?.length ?? 0,
      newMembersThisMonth: newMembersThisMonth.length,
      totalRevenue,
      monthlyRevenue,
      activeCampaigns: campaigns?.filter((c) => c.isActive).length ?? 0,
      totalDonations: donations?.length ?? 0,
    };
  }, [members, donations, campaigns, transactions]);

  const activeCampaigns = useMemo(
    () => (campaigns ?? []).filter((c) => c.isActive),
    [campaigns]
  );

  const recentMembers = useMemo(
    () => (members ?? []).slice(0, 5),
    [members]
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={org?.name || 'Dashboard'}
        description="See how your organization is doing at a glance"
        action={
          <div className="flex gap-2">
            <Link href={`/org/${slug}/members`}>
              <Button variant="outline" size="sm">
                <Users className="mr-2 size-4" />
                Members
              </Button>
            </Link>
            <Link href={`/org/${slug}/campaigns`}>
              <Button size="sm" className="shadow-sm">
                <Megaphone className="mr-2 size-4" />
                New campaign
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={stats.memberCount.toLocaleString()}
          icon={Users}
          description={`${stats.newMembersThisMonth} joined this month`}
        />
        <StatCard
          title="Revenue (This Month)"
          value={`${CURRENCY_SYMBOL}${stats.monthlyRevenue.toLocaleString()}`}
          icon={Wallet}
          description={stats.monthlyRevenue === 0 ? 'Waiting for first payment' : `${CURRENCY} this month`}
        />
        <StatCard
          title="Total Revenue"
          value={`${CURRENCY_SYMBOL}${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          description={stats.totalRevenue === 0 ? 'No revenue yet' : 'All time'}
        />
        <StatCard
          title="Active Campaigns"
          value={stats.activeCampaigns.toLocaleString()}
          icon={Megaphone}
          description={stats.activeCampaigns === 0 ? 'Start a campaign' : 'Running now'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {activeCampaigns.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Active Campaigns</CardTitle>
                <Link href={`/org/${slug}/campaigns`}>
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeCampaigns.slice(0, 3).map((c) => {
                  const computedRaised = campaignTotals?.[c.id] ?? 0;
                  const raisedAmount = Math.max(c.raisedAmount, computedRaised);
                  const progress = c.goalAmount > 0 ? Math.min((raisedAmount / c.goalAmount) * 100, 100) : 0;
                  return (
                    <Link
                      key={c.id}
                      href={`/org/${slug}/campaigns`}
                      className="block rounded-lg border p-4 transition-all hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{c.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          <Target className="mr-1 size-3" />
                          {Math.round(progress)}%
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{raisedAmount.toLocaleString()} {CURRENCY} raised</span>
                          <span>Goal: {c.goalAmount.toLocaleString()} {CURRENCY}</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              progress >= 100 ? 'bg-success' : 'bg-primary'
                            )}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                      {c.endDate && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          <Calendar className="mr-1 inline size-3" />
                          Ends {format(c.endDate.toDate(), 'MMM d, yyyy')}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/org/${slug}/members`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <Users className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Manage members</p>
                  <p className="text-xs text-muted-foreground">View tiers, members, send reminders</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link
                href={`/org/${slug}/donations`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <Heart className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">View donations</p>
                  <p className="text-xs text-muted-foreground">Track donations and donor history</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link
                href={`/org/${slug}/campaigns`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <Megaphone className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Manage campaigns</p>
                  <p className="text-xs text-muted-foreground">Create and edit donation campaigns</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link
                href={`/org/${slug}/rooms`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <MessageSquare className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Chat rooms</p>
                  <p className="text-xs text-muted-foreground">Set up community chat spaces</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link
                href={`/org/${slug}/finance`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <DollarSign className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Finance</p>
                  <p className="text-xs text-muted-foreground">View revenue reports and transactions</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link
                href={`/org/${slug}/settings`}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <Settings className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">Update org profile and preferences</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Revenue Breakdown</CardTitle>
              <Link href={`/org/${slug}/finance`}>
                <Button variant="ghost" size="sm">View details</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.totalRevenue > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                        <DollarSign className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">This Month</p>
                        <p className="text-xs text-muted-foreground">All revenue</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">{CURRENCY_SYMBOL}{stats.monthlyRevenue.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-success/10 to-success/5">
                        <TrendingUp className="size-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">All Time</p>
                        <p className="text-xs text-muted-foreground">Total revenue</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">{CURRENCY_SYMBOL}{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed py-10 text-center">
                  <TrendingUp className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">No revenue yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Revenue from memberships and donations will appear here.
                  </p>
                  <Link href={`/org/${slug}/join`}>
                    <Button variant="outline" size="sm" className="mt-4">
                      <UserPlus className="mr-2 size-4" />
                      View join page
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Members</CardTitle>
            </CardHeader>
            <CardContent>
              {recentMembers.length > 0 ? (
                <div className="space-y-3">
                  {recentMembers.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {m.displayName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.displayName || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.joinedAt?.toDate ? format(m.joinedAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link
                    href={`/org/${slug}/members`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View all members <ArrowRight className="size-3" />
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed py-10 text-center">
                  <Users className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">No members yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Members will appear here when they join.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total donations</span>
                <span className="font-medium">{stats.totalDonations.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active campaigns</span>
                <span className="font-medium">{stats.activeCampaigns.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New members (this month)</span>
                <span className="font-medium">{stats.newMembersThisMonth.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm font-medium">Total revenue</span>
                <span className="text-lg font-bold text-primary">{CURRENCY_SYMBOL}{stats.totalRevenue.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
