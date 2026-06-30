import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import DonateClient from './donate-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  logger.info('page:donate', `generateMetadata: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:donate', `generateMetadata: org not found for slug=${slug}`);
    return { title: 'Organization Not Found' };
  }

  logger.info('page:donate', `generateMetadata: org=${org.id} name=${org.name}`);
  return {
    title: `Donate to ${org.name}`,
    description: `Support ${org.name} with a donation. Your contribution helps them achieve their mission. ${org.description || ''}`,
    openGraph: {
      title: `Donate to ${org.name}`,
      description: org.description || `Support ${org.name} with a donation on Quorum.`,
    },
  };
}

export default async function DonatePage({ params }: Props) {
  const { slug } = await params;
  logger.info('page:donate', `Rendering page: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);
  if (!org) {
    logger.warn('page:donate', `Org not found for slug=${slug}`);
  }
  return <DonateClient slug={slug} initialOrg={org} />;
}
