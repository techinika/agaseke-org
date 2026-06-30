'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function PublicOrgFooter() {
  return (
    <footer className="border-t bg-muted/20 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          Built with <span className="font-medium text-primary/70">Quorum</span>
          <Heart className="size-3 fill-primary/10 text-primary/50" />
        </Link>
      </div>
    </footer>
  );
}
