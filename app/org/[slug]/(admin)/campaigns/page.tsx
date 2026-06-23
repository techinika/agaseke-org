'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { CampaignCard } from '@/components/donations/campaign-card';
import { CampaignForm } from '@/components/donations/campaign-form';
import { useCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from '@/hooks/use-campaigns';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { Campaign } from '@/types/campaign';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

export default function CampaignsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';

  const { data: campaigns, isLoading } = useCampaigns(orgId);
  const createCampaign = useCreateCampaign(orgId);
  const updateCampaign = useUpdateCampaign(orgId);
  const deleteCampaign = useDeleteCampaign(orgId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  async function handleCreate(data: { title: string; description: string; goalAmount: number; endDate: string | null; platformFeePayer: 'org' | 'donor' }) {
    try {
      await createCampaign.mutateAsync({
        title: data.title,
        description: data.description,
        goalAmount: data.goalAmount,
        raisedAmount: 0,
        coverURL: null,
        startDate: Timestamp.now(),
        endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
        isActive: true,
        createdAt: Timestamp.now(),
        platformFeePayer: data.platformFeePayer,
      });
      toast.success('Campaign created');
      setFormOpen(false);
    } catch {
      toast.error('Failed to create campaign');
    }
  }

  async function handleUpdate(data: { title: string; description: string; goalAmount: number; endDate: string | null; platformFeePayer: 'org' | 'donor' }) {
    if (!editingCampaign) return;
    try {
      await updateCampaign.mutateAsync({
        campaignId: editingCampaign.id,
        data: {
          title: data.title,
          description: data.description,
          goalAmount: data.goalAmount,
          endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
          platformFeePayer: data.platformFeePayer,
        },
      });
      toast.success('Campaign updated');
      setFormOpen(false);
      setEditingCampaign(null);
    } catch {
      toast.error('Failed to update campaign');
    }
  }

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
          <Button onClick={() => { setEditingCampaign(null); setFormOpen(true); }}>
            <Plus className="mr-2 size-4" />
            New campaign
          </Button>
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
              onEdit={(c) => { setEditingCampaign(c); setFormOpen(true); }}
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
            <Button onClick={() => { setEditingCampaign(null); setFormOpen(true); }}>
              <Plus className="mr-2 size-4" />
              Create your first campaign
            </Button>
          }
        />
      )}

      <CampaignForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingCampaign(null); }}
        onSubmit={editingCampaign ? handleUpdate : handleCreate}
        editingCampaign={editingCampaign}
      />
    </div>
  );
}
