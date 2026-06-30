import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import PublicChatClient from './chat-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  logger.info('page:chat', `generateMetadata: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:chat', `generateMetadata: org not found for slug=${slug}`);
    return { title: 'Organization Not Found' };
  }

  logger.info('page:chat', `generateMetadata: org=${org.id} name=${org.name}`);
  return {
    title: `${org.name} Chat`,
    description: `Join the conversation at ${org.name}. ${org.description || ''}`,
  };
}

export default async function PublicChatPage({ params }: Props) {
  const { slug } = await params;
  logger.info('page:chat', `Rendering page: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);
  if (!org) {
    logger.warn('page:chat', `Org not found for slug=${slug}`);
  }
  return <PublicChatClient slug={slug} initialOrg={org} />;
}
