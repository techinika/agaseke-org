import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import DonationCheckoutClient from './checkout-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  logger.info('page:donate-checkout', `generateMetadata: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:donate-checkout', `generateMetadata: org not found for slug=${slug}`);
    return { title: 'Organization Not Found' };
  }

  logger.info('page:donate-checkout', `generateMetadata: org=${org.id} name=${org.name}`);
  return {
    title: `Donate to ${org.name} - Checkout`,
    description: `Complete your donation to ${org.name}.`,
  };
}

export default async function DonationCheckoutPage({ params }: Props) {
  const { slug } = await params;
  logger.info('page:donate-checkout', `Rendering page: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);
  if (!org) {
    logger.warn('page:donate-checkout', `Org not found for slug=${slug}`);
  }
  return <DonationCheckoutClient slug={slug} initialOrg={org} />;
}
