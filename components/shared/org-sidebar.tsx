"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Heart,
  Megaphone,
  Wallet,
  MessageSquare,
  Settings,
  Shield,
  ExternalLink,
  X,
  ChevronLeft,
  Menu,
  LogOut,
  User,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { logOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";

interface OrgSidebarProps {
  orgSlug: string;
  orgName: string;
}

const navItems = (slug: string) => [
  { label: "Dashboard", href: `/org/${slug}/dashboard`, icon: LayoutDashboard },
  { label: "Members", href: `/org/${slug}/members`, icon: Users },
  { label: "Donations", href: `/org/${slug}/donations`, icon: Heart },
  { label: "Campaigns", href: `/org/${slug}/campaigns`, icon: Megaphone },
  { label: "Finance", href: `/org/${slug}/finance`, icon: Wallet },
  { label: "Chat Rooms", href: `/org/${slug}/rooms`, icon: MessageSquare },
  { label: "Subscription", href: `/org/${slug}/subscription`, icon: Crown },
  { label: "Settings", href: `/org/${slug}/settings`, icon: Settings },
];

export function OrgSidebar({ orgSlug, orgName }: OrgSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, profile } = useAuthStore();

  async function handleLogout() {
    await logOut();
    router.push("/auth/login");
  }

  return (
    <>
      <button
        className={cn(
          "fixed left-3 top-3 z-50 flex size-9 items-center justify-center rounded-lg border bg-background shadow-sm transition-opacity duration-200 hover:opacity-80",
          sidebarOpen && "hidden",
        )}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="size-4" />
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link
            href={`/org/${orgSlug}/dashboard`}
            className="min-w-0 flex-1"
          >
            <span className="block text-sm font-bold leading-tight break-words [word-break:break-word]">
              {orgName}
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems(orgSlug).map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn("size-4 shrink-0", isActive && "text-primary")}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3 space-y-0.5">
          {user && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {profile?.displayName?.charAt(0)?.toUpperCase() ||
                  user.email?.charAt(0)?.toUpperCase() ||
                  "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {profile?.displayName || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-0.5 pt-1">
            <Link href={`/org/${orgSlug}/my-membership`}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground h-8"
              >
                <User className="mr-2 size-3.5" />
                My membership
              </Button>
            </Link>
            <Link href={`/org/${orgSlug}`} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground h-8"
              >
                <ExternalLink className="mr-2 size-3.5" />
                View public page
              </Button>
            </Link>
            {profile?.isAdmin && (
              <Link href="/admin/organizations">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-primary h-8"
                >
                  <Shield className="mr-2 size-3.5" />
                  Admin panel
                </Button>
              </Link>
            )}
            <Link href="/org">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground h-8"
              >
                <ChevronLeft className="mr-2 size-3.5" />
                All organizations
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive h-8"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 size-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
