'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Banknote, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DonationTable } from '@/components/donations/donation-table';
import { ManualDonationForm } from '@/components/donations/manual-donation-form';
import { useDonations } from '@/hooks/use-donations';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useRequestWithdrawal, usePendingWithdrawals } from '@/hooks/use-withdrawals';
import { CURRENCY, MIN_WITHDRAWAL_AMOUNT } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

export default function DonationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const { data: donations, isLoading } = useDonations(org?.id ?? '');
  const { user } = useAuthStore();
  const requestWithdrawal = useRequestWithdrawal(org?.id ?? '');
  const { data: pendingWithdrawals } = usePendingWithdrawals(org?.id ?? '');

  const activeDonations = useMemo(() => donations?.filter((d) => d.status === 'active') ?? [], [donations]);
  const pendingCount = useMemo(() => donations?.filter((d) => d.status === 'pending').length ?? 0, [donations]);
  const failedCount = useMemo(() => donations?.filter((d) => d.status === 'failed').length ?? 0, [donations]);
  const pendingTotal = useMemo(
    () => donations?.filter((d) => d.status === 'pending').reduce((s, d) => s + d.amount, 0) ?? 0,
    [donations]
  );
  const failedTotal = useMemo(
    () => donations?.filter((d) => d.status === 'failed').reduce((s, d) => s + d.amount, 0) ?? 0,
    [donations]
  );

  const activeTotal = useMemo(
    () => donations?.filter((d) => d.status === 'active').reduce((s, d) => s + d.amount, 0) ?? 0,
    [donations]
  );

  const hasPendingWithdrawal = pendingWithdrawals && pendingWithdrawals.length > 0;

  async function handleRequestWithdrawal() {
    if (!org || !user) return;
    if (!org.bankName || !org.bankAccountName || !org.bankAccountNumber || !org.swiftCode) {
      toast.error('Please add your bank details in Settings before requesting a withdrawal.');
      return;
    }
    if (activeTotal < MIN_WITHDRAWAL_AMOUNT) {
      toast.error(`Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} ${CURRENCY}.`);
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        orgId: org.id,
        amount: activeTotal,
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
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        description="Track and manage all donations received"
        action={<ManualDonationForm orgId={org?.id ?? ''} slug={slug} />}
      />
      {(pendingCount > 0 || failedCount > 0) && (
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-semibold text-warning">{pendingCount} donations</p>
              <p className="text-xs text-muted-foreground">{pendingTotal.toLocaleString()} {CURRENCY}</p>
            </div>
          )}
          {failedCount > 0 && (
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-lg font-semibold text-destructive">{failedCount} donations</p>
              <p className="text-xs text-muted-foreground">{failedTotal.toLocaleString()} {CURRENCY}</p>
            </div>
          )}
        </div>
      )}
      {activeTotal > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available for withdrawal</p>
                <p className="text-2xl font-bold">{activeTotal.toLocaleString()} {CURRENCY}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTotal < MIN_WITHDRAWAL_AMOUNT
                    ? `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} ${CURRENCY}`
                    : 'Withdrawals take 5 working days to process'}
                </p>
              </div>
              <Button
                onClick={handleRequestWithdrawal}
                disabled={requestWithdrawal.isPending || hasPendingWithdrawal || activeTotal < MIN_WITHDRAWAL_AMOUNT}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {requestWithdrawal.isPending ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Banknote className="mr-2 size-4" />
                )}
                {hasPendingWithdrawal ? 'Withdrawal pending' : activeTotal < MIN_WITHDRAWAL_AMOUNT ? `Min. ${MIN_WITHDRAWAL_AMOUNT} ${CURRENCY}` : 'Request withdrawal'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <DonationTable donations={activeDonations} isLoading={isLoading} />
    </div>
  );
}
