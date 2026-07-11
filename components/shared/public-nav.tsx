'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MobileNav } from '@/components/shared/mobile-nav';
import { useAuthStore } from '@/store/auth-store';
import { logOut } from '@/lib/firebase/auth';
import { toast } from 'sonner';

const navLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

export function PublicNav() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  async function handleLogout() {
    const { error } = await logOut();
    if (error) {
      toast.error(error);
      return;
    }
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-lg font-bold tracking-tight"><span className="text-primary">Q</span>uorum.</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground outline-none">
                <Avatar size="sm">
                  {user.photoURL || profile?.photoURL ? (
                    <AvatarImage src={user.photoURL || profile?.photoURL || ''} alt={profile?.displayName || user.displayName || ''} />
                  ) : null}
                  <AvatarFallback>{(profile?.displayName || user.displayName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate">{profile?.displayName || user.displayName || user.email}</span>
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuItem onClick={() => router.push('/org')}>
                  <Building2 className="size-4" />
                  Organizations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-sm font-medium">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="shadow-sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
        <MobileNav navLinks={navLinks} />
      </div>
    </header>
  );
}
