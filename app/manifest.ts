import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quorum.',
    short_name: 'Quorum',
    description:
      'Manage memberships, collect donations, and connect with your community. Built for African nonprofits and associations.',
    start_url: '/org',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FF0000',
    orientation: 'portrait-primary',
    categories: ['business', 'finance', 'nonprofit', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Organizations',
        short_name: 'Orgs',
        description: 'View your organizations',
        url: '/org',
      },
      {
        name: 'Join',
        short_name: 'Join',
        description: 'Join an organization',
        url: '/join',
      },
    ],
    screenshots: [],
  }
}
