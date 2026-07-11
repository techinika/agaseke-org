'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Wallet, TrendingUp, RefreshCw, Activity, Receipt, CheckCircle2, Clock, XCircle, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FinanceCharts } from '@/components/donations/finance-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { useTransactions } from '@/hooks/use-transactions';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useMemberships } from '@/hooks/use-memberships';
import { useRequestWithdrawal, usePendingWithdrawals } from '@/hooks/use-withdrawals';
import { CURRENCY, TXN_STATUSES, MIN_WITHDRAWAL_AMOUNT } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  completed: CheckCircle2,
  failed: XCircle,
  refunded: XCircle,
};

export default function FinancePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const { data: transactions } = useTransactions(orgId);
  const { data: memberships } = useMemberships(orgId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user } = useAuthStore();
  const requestWithdrawal = useRequestWithdrawal(orgId);
  const { data: pendingWithdrawals } = usePendingWithdrawals(orgId);

  const revenueStats = useMemo(() => {
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

  const txnStats = useMemo(() => {
    const all = transactions ?? [];
    return {
      total: all.length,
      completed: all.filter((t) => t.status === 'completed').length,
      pending: all.filter((t) => t.status === 'pending').length,
      failed: all.filter((t) => t.status === 'failed').length,
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return transactions ?? [];
    return (transactions ?? []).filter((t) => t.status === statusFilter);
  }, [transactions, statusFilter]);

  const availableForWithdrawal = useMemo(() => {
    const completed = transactions?.filter((t) => t.status === 'completed') ?? [];
    return completed.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const hasPendingWithdrawal = pendingWithdrawals && pendingWithdrawals.length > 0;

  async function handleRequestWithdrawal() {
    if (!org || !user) return;
    if (!org.bankName || !org.bankAccountName || !org.bankAccountNumber || !org.swiftCode) {
      toast.error('Please add your bank details in Settings before requesting a withdrawal.');
      return;
    }
    if (availableForWithdrawal < MIN_WITHDRAWAL_AMOUNT) {
      toast.error(`Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} ${CURRENCY}.`);
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        orgId: org.id,
        amount: availableForWithdrawal,
        requestedBy: user.uid,
        requestedAt: Timestamp.now(),
        bankDetails: {
          bankName: org.bankName,
          accountName: org.bankAccountName,
          accountNumber: org.bankAccountNumber,
          swiftCode: org.swiftCode,
          bankAddress: org.bankAddress || '',
        },
      });
      toast.success('Withdrawal request submitted. Processing takes 5 working days.');
    } catch {
      toast.error('Failed to request withdrawal');
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finance"
        description="Revenue, transactions, and financial reports"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${revenueStats.totalRevenue.toLocaleString()} ${CURRENCY}`}
          icon={Wallet}
        />
        <StatCard
          title="Donation Revenue"
          value={`${revenueStats.donationRevenue.toLocaleString()} ${CURRENCY}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Membership Revenue"
          value={`${revenueStats.membershipRevenue.toLocaleString()} ${CURRENCY}`}
          icon={Activity}
        />
        <StatCard
          title="Active Renewals"
          value={revenueStats.outstandingRenewals}
          icon={RefreshCw}
        />
      </div>

      {availableForWithdrawal > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available for withdrawal</p>
                <p className="text-2xl font-bold">{availableForWithdrawal.toLocaleString()} {CURRENCY}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {availableForWithdrawal < MIN_WITHDRAWAL_AMOUNT
                    ? `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} ${CURRENCY}`
                    : 'Withdrawals take 5 working days to process'}
                </p>
              </div>
              <Button
                onClick={handleRequestWithdrawal}
                disabled={requestWithdrawal.isPending || hasPendingWithdrawal || availableForWithdrawal < MIN_WITHDRAWAL_AMOUNT}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {requestWithdrawal.isPending ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Banknote className="mr-2 size-4" />
                )}
                {hasPendingWithdrawal ? 'Withdrawal pending' : availableForWithdrawal < MIN_WITHDRAWAL_AMOUNT ? `Min. ${MIN_WITHDRAWAL_AMOUNT} ${CURRENCY}` : 'Request withdrawal'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <FinanceCharts transactions={transactions ?? []} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard
              title="Total"
              value={txnStats.total.toLocaleString()}
              icon={Receipt}
            />
            <StatCard
              title="Completed"
              value={txnStats.completed.toLocaleString()}
              icon={CheckCircle2}
            />
            <StatCard
              title="Pending"
              value={txnStats.pending.toLocaleString()}
              icon={Clock}
            />
            <StatCard
              title="Failed"
              value={txnStats.failed.toLocaleString()}
              icon={XCircle}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            {TXN_STATUSES.map((status) => {
              const Icon = statusIcons[status];
              return (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {Icon && <Icon className="mr-1.5 size-3.5" />}
                  {statusLabels[status] || status}
                </Button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description={
                statusFilter === 'all'
                  ? 'Transactions from memberships and donations will appear here.'
                  : `No ${statusLabels[statusFilter]?.toLowerCase() || statusFilter} transactions.`
              }
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {txn.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {txn.amount.toLocaleString()} {CURRENCY}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            txn.status === 'completed'
                              ? 'default'
                              : txn.status === 'pending'
                                ? 'outline'
                                : 'destructive'
                          }
                          className={
                            txn.status === 'completed'
                              ? 'bg-success text-success-foreground'
                              : txn.status === 'pending'
                                ? 'bg-warning/10 text-warning'
                                : undefined
                          }
                        >
                          {statusLabels[txn.status] || txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {txn.paymentMethod === 'pesapal' ? 'Card' : txn.paymentMethod}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {txn.createdAt?.toDate
                          ? format(txn.createdAt.toDate(), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {transactions?.length ?? 0} transactions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
