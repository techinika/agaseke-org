import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import JoinCheckoutClient from './checkout-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  logger.info('page:join-checkout', `generateMetadata: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:join-checkout', `generateMetadata: org not found for slug=${slug}`);
    return { title: 'Organization Not Found' };
  }

  logger.info('page:join-checkout', `generateMetadata: org=${org.id} name=${org.name}`);
  return {
    title: `Join ${org.name} - Checkout`,
    description: `Complete your membership to ${org.name}.`,
  };
}

export default async function JoinCheckoutPage({ params }: Props) {
  const { slug } = await params;
  logger.info('page:join-checkout', `Rendering page: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);
  if (!org) {
    logger.warn('page:join-checkout', `Org not found for slug=${slug}`);
  }
  return <JoinCheckoutClient slug={slug} initialOrg={org} />;
}
