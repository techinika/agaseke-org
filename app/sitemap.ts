import type { MetadataRoute } from 'next';
import { fetchAllOrganizationSlugs } from '@/lib/firebase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quorum.app';

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/auth/signup`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
  ];

  let orgPages: MetadataRoute.Sitemap = [];
  try {
    const slugs = await fetchAllOrganizationSlugs();
    orgPages = slugs.map((slug) => ({
      url: `${baseUrl}/org/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));
  } catch {
    // If Firestore is unavailable, return static pages only
  }

  return [...staticPages, ...orgPages];
}
