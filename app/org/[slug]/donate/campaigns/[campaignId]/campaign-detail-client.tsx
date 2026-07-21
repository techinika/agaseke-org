'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Calendar, Target, TrendingUp, Heart, Lock, Shield, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';
import { RichTextContent } from '@/components/shared/rich-text-content';
import { OrgNotFound } from '@/components/shared/org-not-found';
import { BrandColorWrapper } from '@/components/shared/brand-color-wrapper';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useCampaign } from '@/hooks/use-campaigns';
import { useCampaignDonationTotals } from '@/hooks/use-campaign-donations';
import { CURRENCY } from '@/lib/constants';
import { format } from 'date-fns';
import type { Organization } from '@/types/organization';
import type { OrgServerData } from '@/lib/firebase/server';

interface CampaignDetailClientProps {
  slug: string;
  campaignId: string;
  initialOrg: OrgServerData | null;
}

export default function CampaignDetailClient({ slug, campaignId, initialOrg }: CampaignDetailClientProps) {
  const router = useRouter();
  const { data: queryOrg, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const org = (queryOrg ?? initialOrg) as Organization | null | undefined;
  const { data: campaign, isLoading: campaignLoading } = useCampaign(org?.id ?? '', campaignId);
  const { data: campaignTotals } = useCampaignDonationTotals(org?.id ?? '');

  if (orgLoading || campaignLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <Skeleton className="mb-8 h-64 rounded-2xl" />
              <div className="grid gap-8 lg:grid-cols-7">
                <div className="lg:col-span-2"><Skeleton className="h-80 rounded-xl" /></div>
                <div className="lg:col-span-5"><Skeleton className="h-96 rounded-xl" /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!org || !campaign) {
    return <OrgNotFound />;
  }

  const computedRaised = campaignTotals?.[campaign.id] ?? 0;
  const raised = Math.max(campaign.raisedAmount, computedRaised);
  const goal = campaign.goalAmount;
  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - raised, 0);

  return (
    <BrandColorWrapper org={org}>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
        <PublicOrgHeader org={org} slug={slug} />

        <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary/60 to-primary/30">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8">
            <button
              onClick={() => router.push(`/org/${slug}/donate`)}
              className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <ArrowLeft className="size-3.5" />
              Back to donate
            </button>
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{campaign.title}</h1>
            {campaign.endDate && (
              <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                <Calendar className="size-4" />
                Ends {format(campaign.endDate.toDate(), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-7">
            <div className="lg:col-span-2">
              <div className="sticky top-6 space-y-6">
                <Card className="overflow-hidden border shadow-sm">
                  <CardContent className="space-y-5 p-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-foreground">{raised.toLocaleString()} {CURRENCY}</p>
                      <p className="mt-1 text-sm text-muted-foreground">raised of {goal.toLocaleString()} {CURRENCY} goal</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <TrendingUp className="size-4 text-primary" />
                          {Math.round(progress)}%
                        </span>
                        <span className="text-muted-foreground">{remaining.toLocaleString()} {CURRENCY} to go</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t pt-5">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <Target className="mx-auto mb-1 size-5 text-primary" />
                        <p className="text-lg font-bold">{goal.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Goal</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <Heart className="mx-auto mb-1 size-5 text-primary" />
                        <p className="text-lg font-bold">{raised.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Raised</p>
                      </div>
                    </div>

                    {campaign.coverURL && (
                      <div className="overflow-hidden rounded-xl">
                        <img
                          src={campaign.coverURL}
                          alt={campaign.title}
                          className="h-48 w-full object-cover"
                        />
                      </div>
                    )}

                    <Button
                      className="h-14 w-full text-base font-semibold shadow-md transition-all hover:shadow-lg"
                      size="lg"
                      onClick={() => router.push(`/org/${slug}/donate?campaignId=${campaign.id}`)}
                    >
                      Donate to this campaign
                      <ChevronRight className="ml-2 size-5" />
                    </Button>

                    {campaign.endDate && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="size-3.5" />
                        Campaign ends {format(campaign.endDate.toDate(), 'MMM d, yyyy')}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Lock className="size-3.5" /> Secure payment</span>
                  <span className="flex items-center gap-1.5"><Shield className="size-3.5" /> Protected</span>
                  <span className="flex items-center gap-1.5"><CreditCard className="size-3.5" /> Cards accepted</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="overflow-hidden border shadow-sm">
                <CardContent className="p-6 sm:p-8">
                  {campaign.description ? (
                    <RichTextContent html={campaign.description} className="prose-lg" />
                  ) : (
                    <p className="py-12 text-center text-muted-foreground">No description provided.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <PublicOrgFooter />
      </div>
    </BrandColorWrapper>
  );
}
