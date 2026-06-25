'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Save, Loader2, Upload, Plus, Pencil, Trash2, MessageSquare, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import { useOrganizationBySlug, useUpdateOrganization } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/use-rooms';
import { useTiers } from '@/hooks/use-tiers';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { Room } from '@/types/room';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { data: org, isLoading } = useOrganizationBySlug(slug);
  const updateOrg = useUpdateOrganization(org?.id ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoURL, setLogoURL] = useState('');
  const [coverURL, setCoverURL] = useState('');
  const [initialized, setInitialized] = useState(false);

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [brandColor, setBrandColor] = useState('#FF0000');

  const [savingSmtp, setSavingSmtp] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadLogo, isUploading: logoUploading } = useImageUpload({ folder: 'logos' });
  const { upload: uploadCover, isUploading: coverUploading } = useImageUpload({ folder: 'covers' });

  const { data: rooms, isLoading: roomsLoading } = useRooms(org?.id ?? '');
  const { data: tiers } = useTiers(org?.id ?? '');
  const createRoom = useCreateRoom(org?.id ?? '');
  const updateRoom = useUpdateRoom(org?.id ?? '');
  const deleteRoom = useDeleteRoom(org?.id ?? '');

  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  if (!initialized && org) {
    setName(org.name);
    setDescription(org.description);
    setLogoURL(org.logoURL ?? '');
    setCoverURL(org.coverURL ?? '');
    setSmtpHost(org.smtpHost ?? '');
    setSmtpPort(String(org.smtpPort ?? 587));
    setSmtpUser(org.smtpUser ?? '');
    setSmtpPass(org.smtpPass ?? '');
    setSmtpFromEmail(org.smtpFromEmail ?? '');
    setSmtpFromName(org.smtpFromName ?? '');
    setBrandColor(org.brandColor ?? '#FF0000');
    setInitialized(true);
  }

  async function handleSave() {
    if (!org) return;
    try {
      await updateOrg.mutateAsync({
        name,
        description,
        logoURL: logoURL || null,
        coverURL: coverURL || null,
        brandColor: brandColor || '#FF0000',
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  }

  async function handleSaveSmtp() {
    if (!org) return;
    setSavingSmtp(true);
    try {
      const res = await fetch('/api/org/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id,
          smtpHost,
          smtpPort: smtpPort ? parseInt(smtpPort) : null,
          smtpUser,
          smtpPass,
          smtpFromEmail,
          smtpFromName,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Email settings saved');
    } catch {
      toast.error('Failed to save email settings');
    } finally {
      setSavingSmtp(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadLogo(file);
    if (url) {
      setLogoURL(url);
      toast.success('Logo uploaded');
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadCover(file);
    if (url) {
      setCoverURL(url);
      toast.success('Cover image uploaded');
    }
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  async function handleCreateRoom(data: {
    name: string;
    description: string;
    type: Room['type'];
    allowedTierIds: string[];
  }) {
    try {
      await createRoom.mutateAsync(data);
      toast.success('Room created');
      setRoomDialogOpen(false);
    } catch {
      toast.error('Failed to create room');
    }
  }

  async function handleUpdateRoom(data: {
    name: string;
    description: string;
    type: Room['type'];
    allowedTierIds: string[];
  }) {
    if (!editingRoom) return;
    try {
      await updateRoom.mutateAsync({ roomId: editingRoom.id, data });
      toast.success('Room updated');
      setRoomDialogOpen(false);
      setEditingRoom(null);
    } catch {
      toast.error('Failed to update room');
    }
  }

  async function handleDeleteRoom(room: Room) {
    if (!confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    try {
      await deleteRoom.mutateAsync(room.id);
      toast.success('Room deleted');
    } catch {
      toast.error('Failed to delete room');
    }
  }

  function handleEditRoom(room: Room) {
    setEditingRoom(room);
    setRoomDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Configure your organization" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  const isAdmin = org.adminIds.includes(user?.uid ?? '');

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Configure your organization settings" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Information</CardTitle>
          <CardDescription>Update your organization&apos;s public details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Tell visitors about your organization..."
              minHeight="200px"
            />
          </div>
          {isAdmin && (
            <Button onClick={handleSave} disabled={updateOrg.isPending}>
              {updateOrg.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save changes
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how your organization looks on its public page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="logoURL">Logo</Label>
                <div className="flex gap-2">
                  <Input
                    id="logoURL"
                    value={logoURL}
                    onChange={(e) => setLogoURL(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Will be used as the org icon and favicon. Leave empty to show only the name.
                </p>
                {logoURL && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={logoURL} alt="Preview" className="size-10 rounded-lg object-cover border" />
                    <span className="text-xs text-muted-foreground">Preview</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverURL">Cover Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="coverURL"
                    value={coverURL}
                    onChange={(e) => setCoverURL(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="flex-1"
                  />
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                  >
                    {coverUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Large banner image shown at the top of your organization page.
                </p>
                {coverURL && (
                  <div className="mt-2 overflow-hidden rounded-lg border">
                    <img src={coverURL} alt="Cover preview" className="h-24 w-full object-cover" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="brandColor"
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="size-10 cursor-pointer rounded-lg border bg-transparent p-0.5"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#FF0000"
                    className="w-32 font-mono text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    Used in email headers and CTAs
                  </span>
                </div>
              </div>
              <Button onClick={handleSave} disabled={updateOrg.isPending}>
                {updateOrg.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Save appearance
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only administrators can modify settings.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Settings</CardTitle>
          <CardDescription>Configure custom SMTP for transactional emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <>
              <p className="text-xs text-muted-foreground">
                By default, emails are sent through the system provider. Configure your own SMTP server
                to send emails from your own domain. Leave empty to use system defaults.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPass">SMTP Password</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email</Label>
                  <Input
                    id="smtpFromEmail"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">From Name</Label>
                  <Input
                    id="smtpFromName"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Organization Name"
                  />
                </div>
              </div>
              <Button onClick={handleSaveSmtp} disabled={savingSmtp}>
                {savingSmtp ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
                Save email settings
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only administrators can modify email settings.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Chat Rooms</CardTitle>
              <CardDescription>Manage chat rooms and configure tier access</CardDescription>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => { setEditingRoom(null); setRoomDialogOpen(true); }}>
                <Plus className="mr-2 size-4" />
                New room
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roomsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{room.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {room.type === 'general' ? 'General' : room.type === 'members_only' ? 'Members only' : 'Tier restricted'}
                        {room.description ? ` · ${room.description}` : ''}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEditRoom(room)}
                        title="Edit room"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteRoom(room)}
                        title="Delete room"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed py-10 text-center">
              <MessageSquare className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No chat rooms yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create chat rooms for your members to communicate.
              </p>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => { setEditingRoom(null); setRoomDialogOpen(true); }}
                >
                  <Plus className="mr-2 size-4" />
                  Create your first room
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRoomDialog
        open={roomDialogOpen}
        onOpenChange={(open) => { setRoomDialogOpen(open); if (!open) setEditingRoom(null); }}
        onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom}
        isSubmitting={createRoom.isPending || updateRoom.isPending}
        editingRoom={editingRoom}
        tiers={tiers ?? []}
      />
    </div>
  );
}
