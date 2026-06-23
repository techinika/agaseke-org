'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { DonationTable } from '@/components/donations/donation-table';
import { useDonations } from '@/hooks/use-donations';
import { useOrganizationBySlug } from '@/hooks/use-organization';

export default function DonationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const { data: donations, isLoading } = useDonations(org?.id ?? '');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        description="Track and manage all donations received"
      />
      <DonationTable donations={donations ?? []} isLoading={isLoading} />
    </div>
  );
}
