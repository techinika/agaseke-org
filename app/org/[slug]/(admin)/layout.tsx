import { OrgSidebar } from '@/components/shared/org-sidebar';
import { AuthGuard } from '@/components/shared/auth-guard';
import { AdminGuard } from '@/components/shared/admin-guard';

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
          <main className="flex-1 overflow-auto lg:pl-64">
            <div className="mx-auto max-w-7xl p-4 pt-20 lg:px-8 lg:pt-8">{children}</div>
          </main>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
