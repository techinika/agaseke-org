import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <p className="text-sm font-semibold">Quorum</p>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Quorum All rights reserved.
            </p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/" className="transition-colors hover:text-foreground">quorum.app</Link>
            <span className="transition-colors hover:text-foreground cursor-default">quorum.org</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
