'use client';

import { useState, useMemo } from 'react';
import { Search, Heart, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Donation } from '@/types/donation';
import { format } from 'date-fns';
import { CURRENCY } from '@/lib/constants';

interface DonationTableProps {
  donations: Donation[];
  isLoading: boolean;
}

export function DonationTable({ donations, isLoading }: DonationTableProps) {
  const [search, setSearch] = useState('');

  const totals = useMemo(() => {
    return donations.reduce(
      (acc, d) => ({
        total: acc.total + d.amount,
        oneTime: acc.oneTime + (d.frequency === 'one_time' ? d.amount : 0),
        monthly: acc.monthly + (d.frequency === 'monthly' ? d.amount : 0),
        annual: acc.annual + (d.frequency === 'annual' ? d.amount : 0),
      }),
      { total: 0, oneTime: 0, monthly: 0, annual: 0 }
    );
  }, [donations]);

  const filtered = useMemo(() => {
    if (!search) return donations;
    const q = search.toLowerCase();
    return donations.filter(
      (d) =>
        d.donorName.toLowerCase().includes(q) ||
        (d.donorEmail && d.donorEmail.toLowerCase().includes(q))
    );
  }, [donations, search]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No donations yet"
        description="Donations from your supporters will appear here."
      />
    );
  }

  const frequencyLabels: Record<string, string> = {
    one_time: 'One-time',
    monthly: 'Monthly',
    annual: 'Annual',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {([
          { label: 'Total', value: totals.total },
          { label: 'One-time', value: totals.oneTime },
          { label: 'Recurring', value: totals.monthly + totals.annual },
        ] as const).map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xl font-bold">
              {stat.value.toLocaleString()} {CURRENCY}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by donor name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" disabled>
          <Download className="mr-2 size-4" />
          Export
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donor</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((donation) => (
              <TableRow key={donation.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{donation.donorName}</p>
                    {donation.donorEmail && (
                      <p className="text-xs text-muted-foreground">{donation.donorEmail}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{donation.campaignId || 'General fund'}</TableCell>
                <TableCell className="font-medium">
                  {donation.amount.toLocaleString()} {CURRENCY}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {frequencyLabels[donation.frequency] || donation.frequency}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={donation.status === 'active' ? 'default' : 'outline'}
                    className={
                      donation.status === 'active'
                        ? 'bg-success text-success-foreground'
                        : donation.status === 'cancelled'
                          ? 'bg-destructive/10 text-destructive'
                          : undefined
                    }
                  >
                    {donation.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(donation.createdAt.toDate(), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {donations.length} donations
      </p>
    </div>
  );
}
