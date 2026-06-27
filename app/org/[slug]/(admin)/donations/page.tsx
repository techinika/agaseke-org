'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { DonationTable } from '@/components/donations/donation-table';
import { useDonations } from '@/hooks/use-donations';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { CURRENCY } from '@/lib/constants';

export default function DonationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const { data: donations, isLoading } = useDonations(org?.id ?? '');

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        description="Track and manage all donations received"
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
      <DonationTable donations={activeDonations} isLoading={isLoading} />
    </div>
  );
}
