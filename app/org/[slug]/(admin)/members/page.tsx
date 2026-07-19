'use client';

import { useParams, useRouter } from 'next/navigation';
import { Plus, Users, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { TierCard } from '@/components/members/tier-card';
import { MemberTable } from '@/components/members/member-table';
import { useTiers, useUpdateTier, useDeleteTier } from '@/hooks/use-tiers';
import { useOrgMembers } from '@/hooks/use-members';
import { useMemberships } from '@/hooks/use-memberships';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { Tier } from '@/types/membership';
import { toast } from 'sonner';

export default function MembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';

  const { data: tiers, isLoading: tiersLoading } = useTiers(orgId);
  const { data: members, isLoading: membersLoading } = useOrgMembers(orgId);
  const { data: memberships } = useMemberships(orgId);

  const updateTier = useUpdateTier(orgId);
  const deleteTier = useDeleteTier(orgId);

  function handleEdit(tier: Tier) {
    router.push(`/org/${slug}/members/tiers/${tier.id}/edit`);
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/org/${slug}/members/add`)}>
              <Plus className="mr-2 size-4" />
              Add member
            </Button>
            <Button onClick={() => router.push(`/org/${slug}/members/tiers/new`)}>
              <Plus className="mr-2 size-4" />
              New tier
            </Button>
          </div>
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
                <Button onClick={() => router.push(`/org/${slug}/members/tiers/new`)}>
                  <Plus className="mr-2 size-4" />
                  Create your first tier
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
