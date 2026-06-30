import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import { logger } from '@/lib/logger';
import PaymentReturnClient from './return-client';

interface Props {
  params: Promise<{ slug: string; depositId: string; type: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  logger.info('page:payment-return', `generateMetadata: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    logger.warn('page:payment-return', `generateMetadata: org not found for slug=${slug}`);
    return { title: 'Payment' };
  }

  logger.info('page:payment-return', `generateMetadata: org=${org.id} name=${org.name}`);
  return {
    title: `Payment - ${org.name}`,
  };
}

export default async function PaymentReturnPage({ params }: Props) {
  const { slug } = await params;
  logger.info('page:payment-return', `Rendering page: slug=${slug}`);
  const org = await fetchOrgBySlug(slug);
  if (!org) {
    logger.warn('page:payment-return', `Org not found for slug=${slug}`);
  }
  return <PaymentReturnClient slug={slug} initialOrg={org} />;
}
