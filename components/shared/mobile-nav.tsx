'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="flex size-10 items-center justify-center rounded-lg md:hidden"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link
              href="#features"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Features
            </Link>
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
          </nav>
        </div>
      )}
    </>
  );
}
