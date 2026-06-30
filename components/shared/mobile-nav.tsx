'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Building2, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth-store';
import { logOut } from '@/lib/firebase/auth';
import { toast } from 'sonner';

interface MobileNavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  navLinks?: MobileNavLink[];
}

export function MobileNav({ navLinks = [] }: MobileNavProps) {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const { error } = await logOut();
    if (error) {
      toast.error(error);
      return;
    }
    router.push('/');
  }

  return (
    <>
      <button
        className="flex size-10 items-center justify-center rounded-lg md:hidden"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-controls="mobile-nav-menu"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="mobile-nav-menu" className="border-t px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <div className="flex items-center gap-3 border-b pb-2 mb-1">
                  <Avatar size="sm">
                    {user.photoURL || profile?.photoURL ? (
                      <AvatarImage src={user.photoURL || profile?.photoURL || ''} alt={profile?.displayName || user.displayName || ''} />
                    ) : null}
                    <AvatarFallback>{(profile?.displayName || user.displayName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{profile?.displayName || user.displayName || user.email}</span>
                </div>
                <Link
                  href="/org"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <Building2 className="size-4" />
                  Organizations
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link href="/auth/signup" className="mt-2" onClick={() => setOpen(false)}>
                  <Button className="w-full">Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Mobile sticky bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-lg md:hidden" aria-label="Mobile navigation">
        <div className="flex items-center justify-around py-2">
          <Link
            href="/"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="size-4" />
            Home
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="text-xs">{link.label === 'How it works' ? 'How it works' : link.label === 'Features' ? 'Features' : 'FAQ'}</span>
            </Link>
          ))}
          {user ? (
            <button
              onClick={() => router.push('/org')}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Building2 className="size-4" />
              Orgs
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
