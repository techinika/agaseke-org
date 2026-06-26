'use client';

import { ReactNode, useEffect } from 'react';
import { Organization } from '@/types/organization';
import { brandColorValues } from '@/lib/utils';

const DEFAULT_FAVICON = '/favicon.svg';

interface BrandColorWrapperProps {
  org: Organization;
  children: ReactNode;
}

const DEFAULT_PRIMARY = '#FF0000';
const DEFAULT_PRIMARY_FOREGROUND = '#ffffff';

function setFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

function setRootCSSVars(primary: string, primaryForeground: string) {
  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--primary-foreground', primaryForeground);
}

function restoreRootCSSVars() {
  document.documentElement.style.removeProperty('--primary');
  document.documentElement.style.removeProperty('--primary-foreground');
}

export function BrandColorWrapper({ org, children }: BrandColorWrapperProps) {
  useEffect(() => {
    if (org.logoURL) {
      setFavicon(org.logoURL);
    }
    return () => setFavicon(DEFAULT_FAVICON);
  }, [org.logoURL]);

  useEffect(() => {
    if (org.brandColor) {
      const { primary, primaryForeground } = brandColorValues(org.brandColor);
      setRootCSSVars(primary, primaryForeground);
    } else {
      setRootCSSVars(DEFAULT_PRIMARY, DEFAULT_PRIMARY_FOREGROUND);
    }
    return () => restoreRootCSSVars();
  }, [org.brandColor]);

  return <>{children}</>;
}