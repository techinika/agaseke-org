'use client';

import { useParams } from 'next/navigation';
import { Wallet, TrendingUp, RefreshCw, Activity } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FinanceCharts } from '@/components/donations/finance-charts';
import { useTransactions } from '@/hooks/use-transactions';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useMemberships } from '@/hooks/use-memberships';
import { useMemo } from 'react';
import { CURRENCY } from '@/lib/constants';

export default function FinancePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const { data: transactions, isLoading: txnLoading } = useTransactions(orgId);
  const { data: memberships } = useMemberships(orgId);

  const stats = useMemo(() => {
    const completed = transactions?.filter((t) => t.status === 'completed') ?? [];
    const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
    const donationRevenue = completed
      .filter((t) => t.type === 'donation')
      .reduce((sum, t) => sum + t.amount, 0);
    const membershipRevenue = completed
      .filter((t) => t.type === 'membership')
      .reduce((sum, t) => sum + t.amount, 0);
    const outstandingRenewals = memberships?.filter((m) => m.status === 'active')?.length ?? 0;
    return { totalRevenue, donationRevenue, membershipRevenue, outstandingRenewals };
  }, [transactions, memberships]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finance"
        description="Revenue, transactions, and financial reports"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${stats.totalRevenue.toLocaleString()} ${CURRENCY}`}
          icon={Wallet}
        />
        <StatCard
          title="Donation Revenue"
          value={`${stats.donationRevenue.toLocaleString()} ${CURRENCY}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Membership Revenue"
          value={`${stats.membershipRevenue.toLocaleString()} ${CURRENCY}`}
          icon={Activity}
        />
        <StatCard
          title="Active Renewals"
          value={stats.outstandingRenewals}
          icon={RefreshCw}
        />
      </div>

      <FinanceCharts transactions={transactions ?? []} />
    </div>
  );
}
