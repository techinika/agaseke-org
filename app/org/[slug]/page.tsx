import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchOrgBySlug } from '@/lib/firebase/server';
import OrgProfileClient from './org-profile-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    return {
      title: 'Organization Not Found',
      description: 'This organization does not exist on Agaseke.',
    };
  }

  return {
    title: org.name,
    description: org.description || `${org.name} - ${org.category} organization on Agaseke. Join, donate, or learn more.`,
    openGraph: {
      title: org.name,
      description: org.description || `${org.name} - ${org.category} organization on Agaseke.`,
      images: org.logoURL ? [{ url: org.logoURL }] : [],
    },
  };
}

export default async function OrgProfilePage({ params }: Props) {
  const { slug } = await params;
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    notFound();
  }

  return <OrgProfileClient slug={slug} />;
}
