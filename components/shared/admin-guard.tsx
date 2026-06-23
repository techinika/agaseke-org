'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { profile, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && profile && profile.type !== 'org_admin') {
      router.push('/');
    }
  }, [profile, isLoading, router]);

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

  return <>{children}</>;
}
