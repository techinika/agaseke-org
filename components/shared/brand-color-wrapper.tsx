'use client';

import { ReactNode } from 'react';
import { Organization } from '@/types/organization';
import { hexToOklch } from '@/lib/utils';

interface BrandColorWrapperProps {
  org: Organization;
  children: ReactNode;
}

export function BrandColorWrapper({ org, children }: BrandColorWrapperProps) {
  const brandStyle = org.brandColor
    ? hexToOklch(org.brandColor)
    : { primary: 'oklch(0.628 0.258 29.23)', primaryForeground: 'oklch(0.985 0 0)' };

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