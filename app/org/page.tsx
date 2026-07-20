"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Plus,
  Building2,
  Globe,
  Tag,
  Mail,
  Check,
  X,
  UserCog,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/store/auth-store";
import { useUserOrganizations, type OrgWithRole } from "@/hooks/use-user-organizations";
import {
  usePendingInvitations,
  useAcceptInvitation,
  useRejectInvitation,
} from "@/hooks/use-invitations";
import { ADMIN_ROLES } from "@/types/admin";
import { toast } from "sonner";

export default function MyOrganizationsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const { data: organizations, isLoading: orgsLoading } = useUserOrganizations(
    user?.uid,
  );
  const { data: invitations, isLoading: invitationsLoading } =
    usePendingInvitations(user?.email ?? undefined);
  const acceptInvitation = useAcceptInvitation();
  const rejectInvitation = useRejectInvitation();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  const handleAccept = async (invitation: NonNullable<typeof invitations>[number]) => {
    if (!user) return;
    try {
      await acceptInvitation.mutateAsync({ invitation, userUid: user.uid });
      toast.success(`You are now an admin of ${invitation.orgName}`);
    } catch {
      toast.error("Failed to accept invitation");
    }
  };

  const handleReject = async (invitation: NonNullable<typeof invitations>[number]) => {
    try {
      await rejectInvitation.mutateAsync(invitation);
      toast.success("Invitation rejected");
    } catch {
      toast.error("Failed to reject invitation");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between w-full">
        <PageHeader
          title="My Organizations"
          description={
            profile?.displayName
              ? `Welcome, ${profile.displayName}`
              : "Manage your organizations"
          }
        />
        <Link href="/org/create" className="mt-4 sm:mt-0 sm:ml-4">
          <Button className="gap-2">
            <Plus className="size-4" />
            New organization
          </Button>
        </Link>
      </div>

      {invitationsLoading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : invitations && invitations.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="size-5" />
            Pending Invitations
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invitations.map((inv) => {
              const roleMeta = ADMIN_ROLES.find((r) => r.value === inv.role);
              return (
                <Card key={inv.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      {inv.orgName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <UserCog className="size-3.5" />
                      {roleMeta?.label ?? inv.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve been invited to join as an administrator.
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleAccept(inv)}
                      disabled={acceptInvitation.isPending}
                    >
                      <Check className="size-3.5" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleReject(inv)}
                      disabled={rejectInvitation.isPending}
                    >
                      <X className="size-3.5" />
                      Reject
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        }}
      >
        {orgsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <Skeleton className="size-12 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))
        ) : organizations && organizations.length > 0 ? (
          organizations.map((org) => (
            <Card key={org.id} className="flex flex-col">
              <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
                <Avatar size="lg">
                  {org.logoURL ? (
                    <AvatarImage src={org.logoURL} alt={org.name} />
                  ) : null}
                  <AvatarFallback className="text-lg font-bold">
                    {org.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-lg">
                    <span className="hidden sm:inline">{org.name}</span>
                    <span className="sm:hidden">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">
                      {org.status}
                    </Badge>
                    <Badge
                      variant={org.userRole === 'admin' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {org.userRole === 'admin' ? 'Admin' : 'Member'}
                    </Badge>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 pt-0">
                <p
                  dangerouslySetInnerHTML={{ __html: org.description }}
                  className="line-clamp-2 text-sm text-muted-foreground"
                ></p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {org.country && (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="size-3" />
                      {org.country}
                    </span>
                  )}
                  {org.category && (
                    <span className="inline-flex items-center gap-1">
                      <Tag className="size-3" />
                      {org.category}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3" />
                    {org.slug}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 border-t pt-4">
                <Link
                  href={`/org/${org.slug}`}
                  target="_blank"
                  className={org.userRole === 'admin' ? 'flex-1' : 'w-full'}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    View page
                  </Button>
                </Link>
                {org.userRole === 'admin' && (
                  <Link href={`/org/${org.slug}/dashboard`} className="flex-1">
                    <Button size="sm" className="w-full gap-1.5">
                      <LayoutDashboard className="size-3.5" />
                      Dashboard
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="py-16">
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                  <Building2 className="size-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    No organizations yet
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first organization to get started.
                  </p>
                </div>
                <Link href="/org/create">
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    Create organization
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
