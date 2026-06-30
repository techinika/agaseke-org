import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import JoinClient from './join-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  logger.info('page:join', `generateMetadata: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:join', `generateMetadata: org not found for slug=${slug}`);
    return { title: 'Organization Not Found' };
  }

  logger.info('page:join', `generateMetadata: org=${org.id} name=${org.name}`);
  return {
    title: `Join ${org.name}`,
    description: `Become a member of ${org.name}. Choose a membership tier and start enjoying benefits. ${org.description || ''}`,
    openGraph: {
      title: `Join ${org.name}`,
      description: org.description || `Become a member of ${org.name} on Quorum.`,
    },
  };
}

export default async function JoinPage({ params }: Props) {
  const { slug } = await params;
  logger.info('page:join', `Rendering page: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);
  if (!org) {
    logger.warn('page:join', `Org not found for slug=${slug}`);
  }
  return <JoinClient slug={slug} initialOrg={org} />;
}
