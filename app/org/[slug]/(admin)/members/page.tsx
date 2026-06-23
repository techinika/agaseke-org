'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Users, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { TierCard } from '@/components/members/tier-card';
import { TierForm } from '@/components/members/tier-form';
import { MemberTable } from '@/components/members/member-table';
import { useTiers, useCreateTier, useUpdateTier, useDeleteTier } from '@/hooks/use-tiers';
import { useOrgMembers } from '@/hooks/use-members';
import { useMemberships } from '@/hooks/use-memberships';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { Tier } from '@/types/membership';
import { toast } from 'sonner';

export default function MembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';

  const { data: tiers, isLoading: tiersLoading } = useTiers(orgId);
  const { data: members, isLoading: membersLoading } = useOrgMembers(orgId);
  const { data: memberships } = useMemberships(orgId);

  const createTier = useCreateTier(orgId);
  const updateTier = useUpdateTier(orgId);
  const deleteTier = useDeleteTier(orgId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);

  async function handleCreateTier(data: { name: string; description: string; price: number; billingCycle: 'monthly' | 'annual' | 'one_time'; benefits: string[]; platformFeePayer: 'org' | 'donor' }) {
    try {
      const order = tiers?.length ?? 0;
      await createTier.mutateAsync({ ...data, isActive: true, order, roomAccess: [] });
      toast.success('Tier created');
      setFormOpen(false);
    } catch {
      toast.error('Failed to create tier');
    }
  }

  async function handleUpdateTier(data: { name: string; description: string; price: number; billingCycle: 'monthly' | 'annual' | 'one_time'; benefits: string[]; platformFeePayer: 'org' | 'donor' }) {
    if (!editingTier) return;
    try {
      await updateTier.mutateAsync({ tierId: editingTier.id, data });
      toast.success('Tier updated');
      setFormOpen(false);
      setEditingTier(null);
    } catch {
      toast.error('Failed to update tier');
    }
  }

  function handleEdit(tier: Tier) {
    setEditingTier(tier);
    setFormOpen(true);
  }

  async function handleToggleActive(tier: Tier) {
    try {
      await updateTier.mutateAsync({ tierId: tier.id, data: { isActive: !tier.isActive } });
      toast.success(tier.isActive ? 'Tier deactivated' : 'Tier activated');
    } catch {
      toast.error('Failed to toggle tier');
    }
  }

  async function handleDelete(tier: Tier) {
    try {
      await deleteTier.mutateAsync(tier.id);
      toast.success('Tier deleted');
    } catch {
      toast.error('Failed to delete tier');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage members and membership tiers"
        action={
          <Button onClick={() => { setEditingTier(null); setFormOpen(true); }}>
            <Plus className="mr-2 size-4" />
            New tier
          </Button>
        }
      />

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="mr-2 size-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="tiers">
            <Layers className="mr-2 size-4" />
            Tiers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <MemberTable
            members={members ?? []}
            tiers={tiers ?? []}
            memberships={memberships ?? []}
            isLoading={membersLoading}
          />
        </TabsContent>

        <TabsContent value="tiers" className="mt-6">
          {tiersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : tiers && tiers.length > 0 ? (
            <div className="space-y-3">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Layers}
              title="No tiers yet"
              description="Create membership tiers to offer different levels of access and benefits."
              action={
                <Button onClick={() => { setEditingTier(null); setFormOpen(true); }}>
                  <Plus className="mr-2 size-4" />
                  Create your first tier
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <TierForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTier(null); }}
        onSubmit={editingTier ? handleUpdateTier : handleCreateTier}
        editingTier={editingTier}
      />
    </div>
  );
}
