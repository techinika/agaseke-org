import { ReactNode } from 'react';
import { Organization } from '@/types/organization';
import { BrandColorWrapper } from '@/components/shared/brand-color-wrapper';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';

interface OrgCheckoutLayoutProps {
  org: Organization | null | undefined;
  slug: string;
  children: ReactNode;
}

export function OrgCheckoutLayout({ org, slug, children }: OrgCheckoutLayoutProps) {
  if (!org) return <>{children}</>;
  return (
    <BrandColorWrapper org={org}>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
        <PublicOrgHeader org={org} slug={slug} />
        {children}
        <PublicOrgFooter orgName={org.name} />
      </div>
    </BrandColorWrapper>
  );
}
