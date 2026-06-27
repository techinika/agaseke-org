import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-8 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Check your internet connection and try again. Some pages may be available
        offline.
      </p>
      <Link
        href="/org"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Go to Organizations
      </Link>
    </div>
  );
}
