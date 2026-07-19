'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useOrgAdmins, useAddOrgAdmin, useUpdateOrgAdmin, useRemoveOrgAdmin } from '@/hooks/use-admins';
import { useAuthStore } from '@/store/auth-store';
import { ADMIN_ROLES, AdminRole } from '@/types/admin';
import { WORKERS } from '@/lib/workers';
import { toast } from 'sonner';

export default function AdminsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const { user } = useAuthStore();
  const { data: admins, isLoading } = useOrgAdmins(orgId);
  const addAdmin = useAddOrgAdmin(orgId);
  const updateAdmin = useUpdateOrgAdmin(orgId);
  const removeAdmin = useRemoveOrgAdmin(orgId);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole>('super-admin');

  const isAdmin = org?.adminIds.includes(user?.uid ?? '');

  async function handleAddAdmin() {
    if (!email || !displayName) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      await addAdmin.mutateAsync({
        uid: `pending_${Date.now()}`,
        email,
        displayName,
        role: selectedRole,
        addedAt: new Date(),
        addedBy: user?.uid ?? '',
      });
      toast.success('Admin added');

      // Send invitation email (fire-and-forget)
      const roleName = ADMIN_ROLES.find((r) => r.value === selectedRole)?.label || selectedRole;
      const footerHtml = org?.name
        ? `<p style="color:#999;font-size:12px;margin-top:24px;">You were added as a <strong>${roleName}</strong> admin for <strong>${org.name}</strong>.</p>`
        : '';
      fetch(`${WORKERS.comm.url}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WORKERS.comm.apiKey,
        },
        body: JSON.stringify({
          to: email,
          subject: `You've been added as an admin for ${org?.name || 'an organization'}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#333;">Admin Invitation</h2>
              <p>Hi ${displayName},</p>
              <p>You have been added as a <strong>${roleName}</strong> for <strong>${org?.name || 'an organization'}</strong>.</p>
              <p>Log in to your Quorum account to access the admin dashboard.</p>
              <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/org/${slug}/dashboard"
                 style="display:inline-block;padding:10px 20px;background:#FF0000;color:#fff;text-decoration:none;border-radius:6px;margin-top:12px;">
                Go to Dashboard
              </a>
              ${footerHtml}
            </div>
          `,
        }),
      }).catch(() => {});
      // Intentionally not awaited — email failure doesn't block admin creation

      setEmail('');
      setDisplayName('');
      setSelectedRole('super-admin');
    } catch {
      toast.error('Failed to add admin');
    }
  }

  async function handleUpdateRole(adminId: string, newRole: AdminRole) {
    try {
      await updateAdmin.mutateAsync({ adminId, data: { role: newRole } });
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  }

  async function handleRemoveAdmin(adminId: string, name: string) {
    if (!confirm(`Remove ${name} as admin? This cannot be undone.`)) return;
    try {
      await removeAdmin.mutateAsync(adminId);
      toast.success('Admin removed');
    } catch {
      toast.error('Failed to remove admin');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Roles" description="Manage organization administrators" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Admin Roles" description="Manage organization administrators and their permissions" />

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Administrator</CardTitle>
            <CardDescription>Add a new administrator to your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AdminRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddAdmin} disabled={addAdmin.isPending}>
              {addAdmin.isPending ? (
                <RefreshCw className="mr-2 size-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 size-4" />
              )}
              Add administrator
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Administrators</CardTitle>
          <CardDescription>{admins?.length ?? 0} administrator(s) configured</CardDescription>
        </CardHeader>
        <CardContent>
          {admins && admins.length > 0 ? (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Shield className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{admin.displayName}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && admin.uid !== user?.uid ? (
                      <>
                        <Select
                          value={admin.role}
                          onValueChange={(v) => handleUpdateRole(admin.id, v as AdminRole)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ADMIN_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAdmin(admin.id, admin.displayName)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {ADMIN_ROLES.find((r) => r.value === admin.role)?.label || admin.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed py-10 text-center">
              <Shield className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No administrators configured</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add administrators to help manage your organization.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Permissions</CardTitle>
          <CardDescription>Understanding what each role can access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {ADMIN_ROLES.map((role) => (
              <div key={role.value} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="size-4 text-primary" />
                  <h3 className="font-medium">{role.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
