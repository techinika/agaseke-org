'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

interface PublicOrgFooterProps {
  orgName: string;
}

export default function PublicOrgFooter({ orgName }: PublicOrgFooterProps) {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/terms"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Privacy
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-center text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Powered by <span className="font-semibold text-primary">Agaseke</span>
            <Heart className="size-3.5 fill-primary/20 text-primary" />
          </Link>
        </div>
      </div>
      <div className="border-t border-border/20 bg-muted/30 py-3">
        <p className="px-4 text-center text-xs text-muted-foreground">
          Agaseke helps nonprofits and associations manage memberships and collect donations.{' '}
          <Link href="/" className="font-medium text-primary hover:underline">
            Start your organization today
          </Link>
        </p>
      </div>
    </footer>
  );
}
