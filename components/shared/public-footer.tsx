import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <span className="text-sm font-bold text-primary-foreground">A</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Agaseke for Organizations</p>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Agaseke. All rights reserved.
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="https://agaseke.me" className="transition-colors hover:text-foreground">agaseke.me</Link>
            <span className="transition-colors hover:text-foreground cursor-default">agaseke.co</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
