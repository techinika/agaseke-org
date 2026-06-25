'use client';

import { useParams, useRouter } from 'next/navigation';
import { Plus, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { CampaignCard } from '@/components/donations/campaign-card';
import { useCampaigns, useUpdateCampaign, useDeleteCampaign } from '@/hooks/use-campaigns';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { Campaign } from '@/types/campaign';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CampaignsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';

  const { data: campaigns, isLoading } = useCampaigns(orgId);
  const updateCampaign = useUpdateCampaign(orgId);
  const deleteCampaign = useDeleteCampaign(orgId);

  async function handleToggleActive(campaign: Campaign) {
    try {
      await updateCampaign.mutateAsync({ campaignId: campaign.id, data: { isActive: !campaign.isActive } });
      toast.success(campaign.isActive ? 'Campaign deactivated' : 'Campaign activated');
    } catch {
      toast.error('Failed to toggle campaign');
    }
  }

  async function handleDelete(campaign: Campaign) {
    try {
      await deleteCampaign.mutateAsync(campaign.id);
      toast.success('Campaign deleted');
    } catch {
      toast.error('Failed to delete campaign');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Create and manage donation campaigns"
        action={
          <Link href={`/org/${slug}/campaigns/new`}>
            <Button>
              <Plus className="mr-2 size-4" />
              New campaign
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={(c) => router.push(`/org/${slug}/campaigns/${c.id}/edit`)}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a donation campaign to rally support for a specific cause or project."
          action={
            <Link href={`/org/${slug}/campaigns/new`}>
              <Button>
                <Plus className="mr-2 size-4" />
                Create your first campaign
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
