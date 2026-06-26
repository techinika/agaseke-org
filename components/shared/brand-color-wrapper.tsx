'use client';

import { ReactNode } from 'react';
import { Organization } from '@/types/organization';
import { brandColorValues } from '@/lib/utils';

interface BrandColorWrapperProps {
  org: Organization;
  children: ReactNode;
}

export function BrandColorWrapper({ org, children }: BrandColorWrapperProps) {
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