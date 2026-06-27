import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import JoinClient from './join-client';

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
  return <JoinClient slug={slug} />;
}
