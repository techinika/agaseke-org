'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Heart,
  MapPin,
  Calendar,
  Target,
  ChevronRight,
  Shield,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useOrgMembers } from '@/hooks/use-members';
import { useActiveCampaigns } from '@/hooks/use-campaigns';
import { useActiveTiers } from '@/hooks/use-tiers';
import { useCampaignDonationTotals } from '@/hooks/use-campaign-donations';
import { format } from 'date-fns';

interface OrgProfileClientProps {
  slug: string;
}

export default function OrgProfileClient({ slug }: OrgProfileClientProps) {
  const router = useRouter();

  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: members } = useOrgMembers(org?.id ?? '');
  const { data: campaigns } = useActiveCampaigns(org?.id ?? '');
  const { data: campaignTotals } = useCampaignDonationTotals(org?.id ?? '');
  const { data: tiers } = useActiveTiers(org?.id ?? '');

  if (orgLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-64 w-full" />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Skeleton className="mb-4 h-12 w-96" />
          <Skeleton className="mb-8 h-6 w-64" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <Building2 className="mx-auto mb-6 size-16 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Organization not found</h1>
          <p className="mt-2 text-muted-foreground">
            This organization doesn&apos;t exist or may have been removed.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => router.push('/')}>
            Go home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PublicOrgHeader org={org} slug={slug} />
      <div className="min-h-screen">
        <div className="relative h-64 bg-gradient-to-br from-primary/90 via-primary/60 to-primary/30 sm:h-80">
          {org.coverURL && (
            <img
              src={org.coverURL}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-end gap-6">
                {org.logoURL && (
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg sm:size-28">
                    <img
                      src={org.logoURL}
                      alt={org.name}
                      className="size-full rounded-2xl object-cover"
                    />
                  </div>
                )}
                <div className="pb-1">
                  <h1 className="text-2xl font-bold text-white sm:text-4xl">{org.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {org.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="size-3.5" />
                      {org.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      Joined {org.createdAt?.toDate ? format(org.createdAt.toDate(), 'MMM yyyy') : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-12">
              <section>
                <h2 className="text-xl font-bold">About</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{org.description}</p>
              </section>

              {campaigns && campaigns.length > 0 && (
                <section>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Active Campaigns</h2>
                    <Link
                      href={`/org/${slug}/donate`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      View all <ChevronRight className="size-4" />
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {campaigns.slice(0, 2).map((c) => {
                      const computedRaised = campaignTotals?.[c.id] ?? 0;
                      const raisedAmount = Math.max(c.raisedAmount, computedRaised);
                      const progress = c.goalAmount > 0 ? Math.min((raisedAmount / c.goalAmount) * 100, 100) : 0;
                      return (
                        <div key={c.id} className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Target className="size-5 text-primary" />
                            </div>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {raisedAmount.toLocaleString()} raised
                            </Badge>
                          </div>
                          <h3 className="mt-3 font-semibold">{c.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{Math.round(progress)}%</span>
                            <span className="text-muted-foreground">
                              {raisedAmount.toLocaleString()} / {c.goalAmount.toLocaleString()} USD
                            </span>
                            </div>
                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                          <Link
                            href={`/org/${slug}/donate?campaignId=${c.id}`}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/80"
                          >
                            Donate <Heart className="size-3.5" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-xl font-bold">Membership Tiers</h2>
                {tiers && tiers.length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {tiers.map((tier) => (
                      <Link
                        key={tier.id}
                        href={`/org/${slug}/join?tierId=${tier.id}`}
                        className="block rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{tier.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">${tier.price}</p>
                            <p className="text-xs text-muted-foreground">/{tier.billingCycle === 'one_time' ? 'once' : tier.billingCycle}</p>
                          </div>
                        </div>
                        {tier.benefits.length > 0 && (
                          <ul className="mt-4 space-y-2 border-t pt-4">
                            {tier.benefits.map((b, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="size-1.5 rounded-full bg-primary" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Membership tiers are being set up.</p>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/org/${slug}/join`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/80"
                  >
                    Join {org.name} <Users className="size-4" />
                  </Link>
                  <Link
                    href={`/org/${slug}/donate`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-all hover:bg-muted"
                  >
                    Make a donation <Heart className="size-4" />
                  </Link>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold">About this organization</h3>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</dt>
                    <dd className="mt-1 text-sm font-medium">{org.category}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Country</dt>
                    <dd className="mt-1 text-sm font-medium">{org.country}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Members</dt>
                    <dd className="mt-1 text-sm font-medium">{members?.length ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <Badge variant="outline" className="bg-success/10 text-success">
                        {org.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                <CreditCard className="size-8 text-primary" />
                <h3 className="mt-3 font-semibold">Support with a donation</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your contribution helps {org.name} achieve its mission.
                </p>
                <Link
                  href={`/org/${slug}/donate`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/80"
                >
                  Donate now <Heart className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicOrgFooter orgName={org.name} />
    </>
  );
}
