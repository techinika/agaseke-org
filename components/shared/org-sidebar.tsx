'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Heart,
  Megaphone,
  Wallet,
  MessageSquare,
  Settings,
  Shield,
  X,
  ChevronLeft,
  Menu,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { logOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

interface OrgSidebarProps {
  orgSlug: string;
}

const navItems = (slug: string) => [
  { label: 'Dashboard', href: `/org/${slug}/dashboard`, icon: LayoutDashboard },
  { label: 'Members', href: `/org/${slug}/members`, icon: Users },
  { label: 'Donations', href: `/org/${slug}/donations`, icon: Heart },
  { label: 'Campaigns', href: `/org/${slug}/campaigns`, icon: Megaphone },
  { label: 'Finance', href: `/org/${slug}/finance`, icon: Wallet },
  { label: 'Chat Rooms', href: `/org/${slug}/rooms`, icon: MessageSquare },
  { label: 'Settings', href: `/org/${slug}/settings`, icon: Settings },
];

export function OrgSidebar({ orgSlug }: OrgSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, profile } = useAuthStore();

  async function handleLogout() {
    await logOut();
    router.push('/auth/login');
  }

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-xl border bg-background shadow-sm lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="size-5" />
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href={`/org/${orgSlug}/dashboard`} className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
              <span className="text-xs font-bold text-primary-foreground">A</span>
            </div>
            <span className="text-sm font-bold tracking-tight">Agaseke</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems(orgSlug).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3 space-y-1">
          {user && (
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {profile?.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{profile?.displayName || 'User'}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}
          <Link href={`/org/${orgSlug}/my-membership`}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <User className="mr-2 size-4" />
              My membership
            </Button>
          </Link>
          {profile?.isAdmin && (
            <Link href="/admin/organizations">
              <Button variant="ghost" size="sm" className="w-full justify-start text-primary">
                <Shield className="mr-2 size-4" />
                Admin panel
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <ChevronLeft className="mr-2 size-4" />
              All organizations
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
