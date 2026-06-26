'use client';

import { ReactNode, useEffect } from 'react';
import { Organization } from '@/types/organization';
import { brandColorValues } from '@/lib/utils';

const DEFAULT_FAVICON = '/favicon.svg';

interface BrandColorWrapperProps {
  org: Organization;
  children: ReactNode;
}

function setFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

export function BrandColorWrapper({ org, children }: BrandColorWrapperProps) {
  useEffect(() => {
    if (org.logoURL) {
      setFavicon(org.logoURL);
    }
    return () => setFavicon(DEFAULT_FAVICON);
  }, [org.logoURL]);

  const brandStyle = org.brandColor
    ? brandColorValues(org.brandColor)
    : { primary: '#FF0000', primaryForeground: '#ffffff' };

  return (
    <div
      style={{
        '--primary': brandStyle.primary,
        '--primary-foreground': brandStyle.primaryForeground,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}