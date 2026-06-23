import { AuthGuard } from '@/components/shared/auth-guard';
import { OrgSidebar } from '@/components/shared/org-sidebar';

interface MemberLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function MemberLayout({ children, params }: MemberLayoutProps) {
  const { slug } = await params;
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <OrgSidebar orgSlug={slug} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 pt-20 lg:px-8 lg:pt-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
