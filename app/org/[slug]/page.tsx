import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import OrgProfileClient from './org-profile-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  logger.info('page:org-profile', `generateMetadata: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:org-profile', `generateMetadata: org not found for slug=${slug}`);
    return {
      title: 'Organization Not Found',
      description: 'This organization does not exist on Quorum.',
    };
  }

  logger.info('page:org-profile', `generateMetadata: org=${org.id} name=${org.name}`);
  return {
    title: org.name,
    description: org.description || `${org.name} - ${org.category} organization on Quorum. Join, donate, or learn more.`,
    icons: org.logoURL ? { icon: org.logoURL } : undefined,
    openGraph: {
      title: org.name,
      description: org.description || `${org.name} - ${org.category} organization on Quorum.`,
      images: org.logoURL ? [{ url: org.logoURL }] : [],
    },
  };
}

export default async function OrgProfilePage({ params }: Props) {
  const { slug } = await params;
  logger.info('page:org-profile', `Rendering page: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:org-profile', `Org not found for slug=${slug}, calling notFound()`);
    notFound();
  }

  logger.info('page:org-profile', `Rendering org=${org.id} name=${org.name}`);
  return <OrgProfileClient slug={slug} initialOrg={org} />;
}
