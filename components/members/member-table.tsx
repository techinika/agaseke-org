'use client';

import { useState, useMemo } from 'react';
import { Search, Users, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { OrgMember } from '@/types/membership';
import { Tier } from '@/types/membership';
import { Membership } from '@/types/membership';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MemberTableProps {
  members: OrgMember[];
  tiers: Tier[];
  memberships: Membership[];
  isLoading: boolean;
}

export function MemberTable({ members, tiers, memberships, isLoading }: MemberTableProps) {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const tierMap = useMemo(() => {
    const map = new Map(tiers.map((t) => [t.id, t]));
    return map;
  }, [tiers]);

  const membershipMap = useMemo(() => {
    const map = new Map(memberships.map((m) => [m.userId, m]));
    return map;
  }, [memberships]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch = m.displayName.toLowerCase().includes(search.toLowerCase());
      const matchesTier = tierFilter === 'all' || m.tierId === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [members, search, tierFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No members yet"
        description="Members will appear here when people join your organization."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tierFilter} onValueChange={(v) => v && setTierFilter(v)}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 size-4" />
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {tiers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Renewal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => {
              const membership = membershipMap.get(member.userId);
              const tier = tierMap.get(member.tierId);
              return (
                <TableRow key={member.userId}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {member.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.displayName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tier?.name || 'Unknown'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={membership?.status === 'active' ? 'default' : 'outline'}
                      className={
                        membership?.status === 'active'
                          ? 'bg-success text-success-foreground'
                          : undefined
                      }
                    >
                      {membership?.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(member.joinedAt.toDate(), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {membership?.renewsAt
                      ? format(membership.renewsAt.toDate(), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {members.length} members
      </p>
    </div>
  );
}
