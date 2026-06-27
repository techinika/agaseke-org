import type { Metadata } from 'next';
import { fetchOrgBySlug } from '@/lib/firebase/server';

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OrgLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrgBySlug(slug);

  if (!org) {
    return { title: 'Organization Not Found' };
  }

  return {
    title: org.name,
    description: org.description || `${org.name} - ${org.category} organization on Quorum.`,
    icons: org.logoURL
      ? { icon: org.logoURL, apple: org.logoURL }
      : undefined,
    openGraph: {
      title: org.name,
      description: org.description || `${org.name} on Quorum.`,
      images: org.logoURL ? [{ url: org.logoURL }] : [],
    },
  };
}

export default async function OrgLayout({ children }: OrgLayoutProps) {
  return <>{children}</>;
}
