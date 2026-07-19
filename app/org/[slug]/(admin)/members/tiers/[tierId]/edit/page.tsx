'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TierFormFields } from '@/components/members/tier-form-fields';
import type { TierFormData } from '@/components/members/tier-form-fields';
import { useUpdateTier, useTiers } from '@/hooks/use-tiers';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { toast } from 'sonner';
import Link from 'next/link';

export default function EditTierPage() {
  const { slug, tierId } = useParams<{ slug: string; tierId: string }>();
  const router = useRouter();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const { data: tiers, isLoading } = useTiers(orgId);
  const updateTier = useUpdateTier(orgId);

  const tier = tiers?.find((t) => t.id === tierId);

  async function handleUpdate(data: TierFormData) {
    try {
      await updateTier.mutateAsync({ tierId, data });
      toast.success('Tier updated');
      router.push(`/org/${slug}/members`);
    } catch {
      toast.error('Failed to update tier');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-4 max-w-lg">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-32 ml-auto" />
        </div>
      </div>
    );
  }

  if (!tier) {
    return (
      <div className="space-y-6">
        <Link href={`/org/${slug}/members`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="size-4" />
          Back to members
        </Link>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Tier not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">This tier doesn&apos;t exist or was deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <Link href={`/org/${slug}/members`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="size-4" />
          Back to members
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Tier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the membership tier details.
        </p>
      </div>

      <div className="max-w-2xl">
        <TierFormFields
          key={tier.id}
          onSubmit={handleUpdate}
          onCancel={() => router.push(`/org/${slug}/members`)}
          submitLabel="Save changes"
          submittingLabel="Saving..."
          defaultValues={{
            name: tier.name,
            description: tier.description,
            price: tier.price,
            billingCycle: tier.billingCycle,
            benefits: tier.benefits,
            platformFeePayer: tier.platformFeePayer,
          }}
        />
      </div>
    </div>
  );
}
