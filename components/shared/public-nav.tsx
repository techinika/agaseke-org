import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/shared/mobile-nav';

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm">
            <span className="text-base font-bold text-primary-foreground">A</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Agaseke</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</Link>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-sm font-medium">Log in</Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm" className="shadow-sm">Get started</Button>
          </Link>
        </nav>
        <MobileNav />
      </div>
    </header>
  );
}
