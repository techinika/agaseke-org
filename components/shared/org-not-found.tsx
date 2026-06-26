'use client';

import { useRouter } from 'next/navigation';
import { Building2, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrgNotFoundProps {
  icon?: LucideIcon;
}

export function OrgNotFound({ icon: Icon = Building2 }: OrgNotFoundProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <Icon className="mx-auto mb-6 size-16 text-muted-foreground/50" />
        <h1 className="text-2xl font-bold">Organization not found</h1>
        <p className="mt-2 text-muted-foreground">
          This organization doesn&apos;t exist or may have been removed.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => router.push('/')}>
          Go home
        </Button>
      </div>
    </div>
  );
}
