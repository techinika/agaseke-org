"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  Users,
  Heart,
  MessageSquare,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Organization } from "@/types/organization";
import { useAuthStore } from "@/store/auth-store";
import { useUserMembership } from "@/hooks/use-memberships";
import { SignInModal } from "@/components/shared/sign-in-modal";

interface PublicOrgHeaderProps {
  org: Organization;
  slug: string;
}

export default function PublicOrgHeader({ org, slug }: PublicOrgHeaderProps) {
  const pathname = usePathname();
  const { user, profile } = useAuthStore();
  const { data: membership } = useUserMembership(org.id, user?.uid ?? "");
  const isMember = !!membership && membership.status === "active";
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const links = [
    { href: `/org/${slug}`, label: "Home", icon: Home },
    { href: `/org/${slug}/join`, label: "Join", icon: Users },
    { href: `/org/${slug}/donate`, label: "Donate", icon: Heart },
  ];

  if (isMember) {
    links.push({
      href: `/org/${slug}/chat`,
      label: "Chat",
      icon: MessageSquare,
    });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-gradient-to-r from-background via-background to-primary/[0.03] backdrop-blur-xl supports-[backdrop-filter]:from-background/80 supports-[backdrop-filter]:via-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/org/${slug}`} className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            {org.logoURL && (
              <img
                src={org.logoURL}
                alt={org.name}
                className="size-9 rounded-xl object-cover"
              />
            )}
          </div>
          <span className="text-base font-semibold tracking-tight">
            {org.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
          {!user && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2 text-xs"
              onClick={() => setSignInOpen(true)}
            >
              <LogIn className="mr-1.5 size-3.5" />
              Sign in
            </Button>
          )}
          {user && (
            <Link
              href={`/org/${slug}/dashboard`}
              className="ml-2 flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {(profile?.displayName || user.displayName || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </Link>
          )}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden"
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <SignInModal
        open={signInOpen}
        onOpenChange={setSignInOpen}
        redirectPath={pathname}
      />

      {menuOpen && (
        <div className="border-t border-border/40 sm:hidden">
          <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            ))}
            {!user && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setSignInOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogIn className="size-4" />
                Sign in
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
