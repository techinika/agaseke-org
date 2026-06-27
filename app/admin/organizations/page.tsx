'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { ExternalLink, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useAllOrganizations } from '@/hooks/use-all-organizations';

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const { data: organizations, isLoading: orgsLoading } = useAllOrganizations();

  useEffect(() => {
    if (!authLoading && (!user || !profile?.isAdmin)) {
      router.replace('/');
    }
  }, [authLoading, user, profile, router]);

  if (authLoading || !user || !profile?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="All Organizations"
        description="Super admin overview of all organizations on the platform."
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Organizations ({organizations?.length ?? 0})</CardTitle>
          <CardDescription>
            View and manage all organizations registered on Quorum.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admins</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : organizations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No organizations found.
                  </TableCell>
                </TableRow>
              ) : (
                organizations?.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          {org.logoURL ? (
                            <AvatarImage src={org.logoURL} alt={org.name} />
                          ) : null}
                          <AvatarFallback>
                            {org.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{org.country}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{org.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.status === 'active' ? 'default' : 'outline'}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" />
                        <span>{org.adminIds.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/org/${org.slug}/dashboard`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
                      >
                        Open
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
