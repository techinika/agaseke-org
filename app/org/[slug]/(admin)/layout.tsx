import { OrgSidebar } from '@/components/shared/org-sidebar';
import { AuthGuard } from '@/components/shared/auth-guard';
import { AdminGuard } from '@/components/shared/admin-guard';
import { AdminMainContent } from '@/components/shared/admin-main-content';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { slug } = await params;
  return (
    <AuthGuard>
      <AdminGuard>
        <div className="flex min-h-screen">
          <OrgSidebar orgSlug={slug} />
          <AdminMainContent>{children}</AdminMainContent>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
