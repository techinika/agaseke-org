import { AuthGuard } from '@/components/shared/auth-guard';
import { OrgSidebar } from '@/components/shared/org-sidebar';
import { AdminMainContent } from '@/components/shared/admin-main-content';
import { fetchOrgBySlug } from '@/lib/firebase/server';

interface MemberLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function MemberLayout({ children, params }: MemberLayoutProps) {
  const { slug } = await params;
  const org = await fetchOrgBySlug(slug);
  const orgName = org?.name || slug;
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <OrgSidebar orgSlug={slug} orgName={orgName} />
        <AdminMainContent>{children}</AdminMainContent>
      </div>
    </AuthGuard>
  );
}
