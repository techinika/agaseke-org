'use client';

import { useEffect, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const params = useParams();
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const slug = params?.slug as string | undefined;
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug ?? '');

  const isLoading = authLoading || orgLoading;

  useEffect(() => {
    if (!isLoading && (!profile || profile.type !== 'org_admin')) {
      router.push('/');
    }
  }, [profile, isLoading, router]);

  useEffect(() => {
    if (!isLoading && profile?.type === 'org_admin' && org && user) {
      const isOrgAdmin = org.adminIds?.includes(user.uid);
      if (!isOrgAdmin) {
        router.push('/');
      }
    }
  }, [isLoading, profile, org, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || profile.type !== 'org_admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 py-20">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Admin access required</h2>
        <p className="text-muted-foreground">
          You need admin privileges to access this page.
        </p>
      </div>
    );
  }

  if (org && user && !org.adminIds?.includes(user.uid)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 py-20">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="size-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Not authorized</h2>
        <p className="text-muted-foreground">
          You are not an admin of this organization.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
