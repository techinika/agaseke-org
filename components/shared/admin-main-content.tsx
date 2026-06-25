'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';

export function AdminMainContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUIStore();

  return (
    <main
      className={cn(
        'flex-1 overflow-auto transition-all duration-200',
        sidebarOpen && 'lg:pl-64'
      )}
    >
      <div className="mx-auto max-w-7xl p-4 pt-20 lg:px-8 lg:pt-8">{children}</div>
    </main>
  );
}
