'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Shield, Lock, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useActiveCampaigns } from '@/hooks/use-campaigns';
import { useCampaignDonationTotals } from '@/hooks/use-campaign-donations';
import { useAuthStore } from '@/store/auth-store';
import { CURRENCY, DONATION_FREQUENCIES } from '@/lib/constants';
import { format } from 'date-fns';
import type { Organization } from '@/types/organization';
import { BrandColorWrapper } from '@/components/shared/brand-color-wrapper';
import { OrgNotFound } from '@/components/shared/org-not-found';
import type { OrgServerData } from '@/lib/firebase/server';

const AMOUNT_PRESETS = [10, 25, 50, 100, 250];
type Frequency = (typeof DONATION_FREQUENCIES)[number];

interface DonateClientProps {
  slug: string;
  initialOrg: OrgServerData | null;
}

export default function DonateClient({ slug, initialOrg }: DonateClientProps) {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { data: queryOrg, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const org = (queryOrg ?? initialOrg) as Organization | null | undefined;
  const { data: campaigns, isLoading: campaignsLoading } = useActiveCampaigns(org?.id ?? '');
  const { data: campaignTotals } = useCampaignDonationTotals(org?.id ?? '');

  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('one_time');
  const [campaignId, setCampaignId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('campaignId') ?? '';
    }
    return '';
  });

  const [donorName, setDonorName] = useState(user ? (profile?.displayName || user.displayName || '') : '');
  const [donorEmail, setDonorEmail] = useState(user ? (profile?.email || user.email || '') : '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  const displayAmount = customAmount ? parseInt(customAmount) : amount;

  function handlePresetClick(value: number) {
    setAmount(value);
    setCustomAmount('');
  }

  function handleProceed() {
    if (displayAmount < 1) return;
    const params = new URLSearchParams({
      amount: displayAmount.toString(),
      frequency,
      campaignId: campaignId || '',
      donorName: isAnonymous ? 'Anonymous' : donorName,
      donorEmail: isAnonymous ? '' : donorEmail,
      message,
    });
    router.push(`/org/${slug}/donate/checkout?${params}`);
  }

  if (orgLoading || campaignsLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-3xl px-4">
          <Skeleton className="mx-auto mb-8 h-48 max-w-md rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!org) {
    return <OrgNotFound />;
  }

  const frequencyLabels: Record<Frequency, string> = {
    one_time: 'One time',
    monthly: 'Monthly',
    annual: 'Annual',
  };

  return (
    <BrandColorWrapper org={org}>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
        <PublicOrgHeader org={org} slug={slug} />
        <div className="relative h-48 bg-gradient-to-br from-primary/90 via-primary/60 to-primary/30 sm:h-56">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-4">
                  {org.logoURL && (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg sm:size-20">
                      <img src={org.logoURL} alt={org.name} className="size-full rounded-xl object-cover" />
                    </div>
                  )}
                <div className="pb-1">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">Support {org.name}</h1>
                  <p className="mt-1 max-w-2xl text-sm text-white/80 sm:text-base">
                    Your contribution makes a difference.
                  </p>
                  {campaigns && campaigns.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {campaigns.slice(0, 3).map((c) => (
                        <span key={c.id} className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white/90">
                          {c.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">

          <Card className="overflow-hidden border shadow-sm">
            <CardContent className="space-y-8 p-6 sm:p-8">
              <div>
                <Label className="mb-4 block text-base font-semibold">1. Select amount</Label>
                <div className="grid grid-cols-5 gap-2">
                  {AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick(preset)}
                      className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                        amount === preset && !customAmount
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      {preset / 1000}k
                    </button>
                  ))}
                </div>
                <div className="relative mt-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    {CURRENCY}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                    className="h-12 pl-12 text-base"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-4 block text-base font-semibold">2. Choose frequency</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(frequencyLabels) as [Frequency, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setFrequency(key)}
                      className={`rounded-xl border py-3.5 text-sm font-semibold transition-all ${
                        frequency === key
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {campaigns && campaigns.length > 0 && (
                <div>
                  <Label className="mb-4 block text-base font-semibold">3. Allocate to (optional)</Label>
                  <div className="grid gap-2">
                    <button
                      onClick={() => setCampaignId('')}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        campaignId === '' ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <p className="font-medium">General fund</p>
                      <p className="text-sm text-muted-foreground">Support the organization directly</p>
                    </button>
                    {campaigns.map((c) => {
                      const computedRaised = campaignTotals?.[c.id] ?? 0;
                      const raisedAmount = Math.max(c.raisedAmount, computedRaised);
                      const progress = c.goalAmount > 0 ? Math.min((raisedAmount / c.goalAmount) * 100, 100) : 0;
                      return (
                        <div key={c.id} className="relative">
                          <button
                            onClick={() => setCampaignId(c.id)}
                            className={`w-full rounded-xl border p-4 pr-10 text-left transition-all ${
                              campaignId === c.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50 hover:bg-primary/5'
                            }`}
                          >
                            <p className="font-medium">{c.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {raisedAmount.toLocaleString()} / {c.goalAmount.toLocaleString()} {CURRENCY}
                              {c.endDate && ` · Ends ${format(c.endDate.toDate(), 'MMM d, yyyy')}`}
                            </p>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </button>
                          <Link
                            href={`/org/${slug}/donate/campaigns/${c.id}`}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View campaign details"
                          >
                            <ExternalLink className="size-4" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-4 block text-base font-semibold">4. Your information</Label>
                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="size-4 rounded border-muted-foreground text-primary"
                    />
                    <div>
                      <p className="text-sm font-medium">Donate anonymously</p>
                      <p className="text-xs text-muted-foreground">Your name won&apos;t be shown publicly</p>
                    </div>
                  </label>
                  {!isAnonymous && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        placeholder="Your name"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        className="h-12"
                      />
                      <Input
                        type="email"
                        placeholder="Your email (for receipt)"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  )}
                  <Textarea
                    placeholder="Leave a message (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              <Button
                className="h-14 w-full text-base font-semibold shadow-md transition-all hover:shadow-lg"
                size="lg"
                onClick={handleProceed}
                disabled={displayAmount < 1}
              >
                Donate {displayAmount.toLocaleString()} {CURRENCY}
                <ChevronRight className="ml-2 size-5" />
              </Button>

              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Lock className="size-3.5" /> Secure payment</span>
                <span className="flex items-center gap-1.5"><Shield className="size-3.5" /> Protected</span>
                <span className="flex items-center gap-1.5"><CreditCard className="size-3.5" /> Cards accepted</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <PublicOrgFooter />
      </div>
    </BrandColorWrapper>
  );
}
