import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/shared/mobile-nav';

const navLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
];

export function PublicNav() {
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
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-sm font-medium">Log in</Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm" className="shadow-sm">Get started</Button>
          </Link>
        </nav>
        <MobileNav navLinks={navLinks} />
      </div>
    </header>
  );
}
