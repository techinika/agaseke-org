'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TierFormFields } from '@/components/members/tier-form-fields';
import type { TierFormData } from '@/components/members/tier-form-fields';
import { useCreateTier, useTiers } from '@/hooks/use-tiers';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewTierPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const { data: tiers } = useTiers(orgId);
  const createTier = useCreateTier(orgId);

  async function handleCreate(data: TierFormData) {
    try {
      const order = tiers?.length ?? 0;
      await createTier.mutateAsync({ ...data, isActive: true, order, roomAccess: [] });
      toast.success('Tier created');
      router.push(`/org/${slug}/members`);
    } catch {
      toast.error('Failed to create tier');
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <Link href={`/org/${slug}/members`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="size-4" />
          Back to members
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Tier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new membership tier for your organization.
        </p>
      </div>

      <div className="max-w-2xl">
        <TierFormFields
          onSubmit={handleCreate}
          onCancel={() => router.push(`/org/${slug}/members`)}
          submitLabel="Create tier"
          submittingLabel="Creating..."
        />
      </div>
    </div>
  );
}
