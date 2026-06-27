import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import DonateClient from './donate-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    return { title: 'Organization Not Found' };
  }

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
  return <DonateClient slug={slug} />;
}
