import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import CampaignDetailClient from './campaign-detail-client';

interface Props {
  params: Promise<{ slug: string; campaignId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrgBySlug(slug);
  if (!org) return { title: 'Campaign Not Found' };
  return {
    title: `${org.name} Campaign`,
    description: `View campaign details and donate to ${org.name}.`,
  };
}

export default async function CampaignDetailPage({ params }: Props) {
  const { slug, campaignId } = await params;
  logger.info('page:campaign-detail', `Rendering page: slug=${slug} campaignId=${campaignId}`);
  const org = await fetchOrgBySlug(slug);
  return <CampaignDetailClient slug={slug} campaignId={campaignId} initialOrg={org} />;
}
