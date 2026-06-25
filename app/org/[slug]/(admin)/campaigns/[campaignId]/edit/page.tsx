'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignFormFields } from '@/components/donations/campaign-form-fields';
import { useCampaign, useUpdateCampaign } from '@/hooks/use-campaigns';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function EditCampaignPage() {
  const { slug, campaignId } = useParams<{ slug: string; campaignId: string }>();
  const router = useRouter();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const { data: campaign, isLoading } = useCampaign(orgId, campaignId);
  const updateCampaign = useUpdateCampaign(orgId);

  async function handleUpdate(data: { title: string; description: string; goalAmount: number; endDate: string | null; platformFeePayer: 'org' | 'donor' }) {
    try {
      await updateCampaign.mutateAsync({
        campaignId,
        data: {
          title: data.title,
          description: data.description,
          goalAmount: data.goalAmount,
          endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
          platformFeePayer: data.platformFeePayer,
        },
      });
      toast.success('Campaign updated');
      router.push(`/org/${slug}/campaigns`);
    } catch {
      toast.error('Failed to update campaign');
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
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-32 ml-auto" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Link href={`/org/${slug}/campaigns`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="size-4" />
          Back to campaigns
        </Link>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Campaign not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">This campaign doesn&apos;t exist or was deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <Link href={`/org/${slug}/campaigns`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 block">
            <ArrowLeft className="size-4" />
            Back to campaigns
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Edit Campaign</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your donation campaign.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <CampaignFormFields
          defaultValues={{
            title: campaign.title,
            description: campaign.description,
            goalAmount: campaign.goalAmount,
            endDate: campaign.endDate?.toDate().toISOString().split('T')[0] ?? '',
            platformFeePayer: campaign.platformFeePayer,
          }}
          onSubmit={handleUpdate}
          onCancel={() => router.push(`/org/${slug}/campaigns`)}
          submitLabel="Save changes"
          submittingLabel="Saving..."
        />
      </div>
    </div>
  );
}
