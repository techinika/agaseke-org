'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CampaignFormFields } from '@/components/donations/campaign-form-fields';
import { useCreateCampaign } from '@/hooks/use-campaigns';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function NewCampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const createCampaign = useCreateCampaign(orgId);

  async function handleCreate(data: { title: string; description: string; goalAmount: number; endDate: string | null; platformFeePayer: 'org' | 'donor'; withdrawalTrigger: 'target_reached' | 'anytime' }) {
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
        withdrawalTrigger: data.withdrawalTrigger,
      });
      toast.success('Campaign created');
      router.push(`/org/${slug}/campaigns`);
    } catch {
      toast.error('Failed to create campaign');
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <Link href={`/org/${slug}/campaigns`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 block">
            <ArrowLeft className="size-4" />
            Back to campaigns
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Launch a new donation campaign with a goal and deadline.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <CampaignFormFields
          onSubmit={handleCreate}
          onCancel={() => router.push(`/org/${slug}/campaigns`)}
          submitLabel="Create campaign"
          submittingLabel="Creating..."
        />
      </div>
    </div>
  );
}
